title=git分支管理与使用规范
date=2016-06-21T14:52:32+08:00
type=post
tags=git
status=published
~~~~~~

<!-- # git分支管理与使用规范 -->
## 分支管理
### flow
* git flow
* github flow
* gitlab flow
* fn flow
<!-- more -->

### 分支与开发定义
#### 主要分支
* master

    线上分支, 一直存在

* develop

    常规开发分支, 一直存在

* masterfix

    线上bug修改分支, 一直存在 

#### 辅助分支
* feature/*

    功能开发分支, 从develop分支而来, 然后合并入develop, 最终删除.

* release/*

    上线分支, 从develop分支而来, 然后合并入master, 并应用到develop, 最终删除.

* hotfix/*

    线上bug修改分支, 从masterfix分支而来, 然后合并入masterfix, 最终删除.

### 如何使用各种分支
#### init
一个项目初始有master分支, 需要新建立一个develop分支和masterfix分支.

    git br -b develop 
    git push origin develop

    git br -b masterfix
    git push origin masterfix

#### feature
常规功能开发需要从develop分支checkout出feature分支.

    git checkout -b feature/GET-1008-添加用户查询列表 [develop]
    
开发完毕后合并回develop分支

    git checkout develop
    git pull // 先更新develop
    git merge feature/GET-1008-添加用户查询列表 --no-ff
    git push origin develop

    git branch -d feature/GET-1008-添加用户查询列表


#### Release
开发完毕, 准备发布:

    git checkout -b release/1.0.0 [develop]

然后在发布分支上处理一些发布操作, 比如更改版本号, 上线前测试, 问题修改等等. 当分支可以进行上线发布后:

    git checkout master
    git merge release/1.0.0 --no-ff 
    git tag -a 1.0.0

至此release完成, 但是需要将在release分支上的修改应用到develop上.

    git checkout develop
    git merge release/1.0.0 --no-ff

    git branch -d release/1.0.0

然后, 我们可以激活masterfix分支, 同步一下已经上线的master分支, 为修改将要出现的线上bug做准备

    git checkout masterfix
    git merge master // 在正常情况下, 这里一定是fast-faward

## hotfix
当出现bug时, 我们需要从master或者是masterfix分支上分出hotfix分支来修改bug.

    git checkout -b hotfix/修改空指针 masterfix

修改完毕后

    git checkout masterfix
    git merge hotfix/修改空指针 --no-ff

期间可以进行多次hotfix, 最后当masterfix测试后没有问题, 准备上线:
    
    git checkout master
    git merge masterfix --no-ff

在master上打下当前上线的tag

    git tag -a 1.0.1

同样, 这些修改要应用到develop分支上

    git checkout develop
    git merge masterfix --no-ff


### 分支与环境对应?
* master    --  online
* release   --  off
* develop   --  ci
* masterfix --  online-bug-fix
* feature   --  local, dev

### 总结


## 使用规范
### 鼓励开分支
鼓励本地开分支开发, 独立功能独立分支.

### 将分支上提交合并

分支上开发的commit建议合并为一个commit, 这样易读, 方便主分支管理.

一种最简单直接的方法

    git reset [分支开始处]
    git commit -m "..."

另一种方法, 在feature分支上执行

    git rebase -i develop // 将feature分支的修改应用到develop上

    // 后续操作
    http://www.ruanyifeng.com/blog/2015/08/git-use-process.html

### 保留分支信息

在不同分支合并时使用 `--no-ff` 参数生成merge commit

    commit e562022b423f7bf29f77927dea4d13cb05230681
    Merge: d88f815 799b7f8
    Author: 杨晓辰 <yangxiaochen@yangxiaochendemacbook-pro.local>
    Date:   Tue May 31 17:10:41 2016 +0800

        Merge branch 'feature/welcome' into develop

    commit 799b7f87b99d5f5c49acf2edd8a6a363ff44f29f
    Author: 杨晓辰 <yangxiaochen@yangxiaochendemacbook-pro.local>
    Date:   Tue May 31 17:10:11 2016 +0800

        也修改auth

    commit 18e7893f1583559003f7a4bb41fd03b937b3ed42
    Author: 杨晓辰 <yangxiaochen@yangxiaochendemacbook-pro.local>
    Date:   Tue May 31 17:08:04 2016 +0800

        修改 auth


### 减少以及消除无意义的分支内merge

同一分支更新时要避免产生无意义的merge

如果是一个人使用git-flow, 你会发现你所有的commit以及commit log都是有意义的. 你所有的更改, feature合并都是有明确记录的.

但是在多人使用下, 大家各自在本地开发, 往develop分支上merge, 那么就会出现每个人的develop分支不一致. 那么当一个人把自己的develop分支push到远端时, 其他人pull的时候就会出现分支合并, 产生 "Merge branch 'develop' of remote into develop" 的类似commit. 

很多时候, 合并时没有冲突, 自动完成. 这种merge产生的commit是没有意义的, 而且会让分支看起来混乱.

按照以下规则可以减少甚至消除这种无意义的commit:

1. 本地在往develop分支进行合并时, ** `先在develop上执行git pull` **, 当你没有在本地对develop分支有commit时, 执行`git pull`是会发生Fast-forward合并的, 这种默认并不产生commit.
2. 将feature合并到develop上.
3. push develop. 将你的修改提交到远端.

多数时候, 如果多个人分开执行以上操作, 是不会有问题的.

如果多个人同时进行以上操作, 那么在进行第三步的时候, 是push不上去的, 需要先pull, 那么又会产生所谓的无意义commit, 该怎么办呢:

这时不要用`git pull`来拉取更改, 改为使用:

    git pull --rebase

这个命令会将远端代develop拉下来, 然后从本地develop上跟远端develop分叉的地方开始, 将本地的commit一个个应用到远端develop的末端, 使之成为一条直线, 从而没有了merge commit.

关于冲突, rebase的时候也会有冲突:

比如远端 `a->b->c`

你的 `a->b->d`

进行rebase之后 `a->b->c->e`, 其中`e`的更改内容和log就是你的`d`, 如果有冲突, 冲突的修改也是提现在`e`中


### 冲突提交
修改完冲突, 我们会进行commit提交冲突修改. **不要使用`git commit -m`, 请直接使用`git commit`, git会识别你这是一个冲突提交.**

### 常用操作

回滚
    git reset --hard [version]  // 丢弃版本后的所有修改
    git reset [version]         // 保留版本后的所有已提交修改
    git reset --soft [version]  // 保留版本后的所有已提交修改到commit stage

补充提交

    git commit --amend

提交tag到服务器

    git push origin --tags

日志与diff

    sourcetree // 软件

# 参考
[http://nvie.com/posts/a-successful-git-branching-model/](http://nvie.com/posts/a-successful-git-branching-model/)

[Git 工作流程](http://www.ruanyifeng.com/blog/2015/12/git-workflow.html)

[合并commit](http://www.ruanyifeng.com/blog/2015/08/git-use-process.html)