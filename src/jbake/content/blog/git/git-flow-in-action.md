title=git-flow实践
date=2016-06-12T13:52:32+08:00
type=post
tags=git,gitflow
status=published
~~~~~~

<!-- # git-flow 操作实践 -->

## 安装

    brew install git-flow

<!-- more -->

## init

    $ git flow init

    Initialized empty Git repository in ~/project/.git/
    No branches exist yet. Base branches must be created now.
    Branch name for production releases: [master]
    Branch name for "next release" development: [develop]

    How to name your supporting branch prefixes?
    Feature branches? [feature/]
    Release branches? [release/]
    Hotfix branches? [hotfix/]
    Support branches? [support/]
    Version tag prefix? []

这时会在当前目录执行git init操作. 并且生成4个分支名字, 并且默认在develop分支上, develop分支就是我们主要工作的地方.

    $ git branch
    * develop
    master

我们除了要把master分支推到远端仓库, develop同样也要推到远端仓库 `git push origin develop`

## Feature branches
开始一个新功能添加, 或者是一般bug修复, 或者是其他功能. 我们需要开一个feature分支. 我们在本地的主要工作都是要开feature分支完成的. ** 不要在develop 分支上开发. **

    $ git flow feature start authentication
    Switched to a new branch 'feature/authentication'

    Summary of actions:
    - A new branch 'feature/authentication' was created, based on 'develop'
    - You are now on branch 'feature/authentication'

    Now, start committing on your feature. When done, use:

        git flow feature finish authentication

然后你可以做自己的修改了, 完成后, 需要将feature合并回develop分支.

    $ git flow feature finish authentication
    Switched to branch 'develop'
    Updating 9060376..00bafe4
    Fast-forward
    authentication.txt | 1 +
    1 file changed, 1 insertion(+)
    create mode 100644 authentication.txt
    Deleted branch feature/authentication (was 00bafe4).

    Summary of actions:
    - The feature branch 'feature/authentication' was merged into 'develop'
    - Feature branch 'feature/authentication' has been removed
    - You are now on branch 'develop'

> 多个开发者进行开发时, 会出现每个人本地的develop分支不一致的情况, 这样在每次拉取远端develop分支时, 会出现很多merge提交. 关于这个问题, 在最后的`减少以及消灭无用的merge commit`章节中说明.

## releases
在没有使用git-flow工具时, 发布是一件很繁琐的事情, 要保留一个用于releases的分支, 打tag等. 使用git-flow可以用简单命令解决.

    $ git flow release start 0.1.0
    Switched to a new branch 'release/0.1.0'

    Summary of actions:
    - A new branch 'release/0.1.0' was created, based on 'develop'
    - You are now on branch 'release/0.1.0'

    Follow-up actions:
    - Bump the version number now!
    - Start committing last-minute fixes in preparing your release
    - When done, run:

        git flow release finish '0.1.0' 

你将开始一个发布, 一般可以直接finishi

    $ git flow release finish 0.1.0
    Switched to branch 'master'
    Merge made by the 'recursive' strategy.
    authentication.txt | 1 +
    1 file changed, 1 insertion(+)
    create mode 100644 authentication.txt
    Deleted branch release/0.1.0 (was 1b26f7c).

    Summary of actions:
    - Latest objects have been fetched from 'origin'
    - Release branch has been merged into 'master'
    - The release was tagged '0.1.0'
    - Release branch has been back-merged into 'develop'
    - Release branch 'release/0.1.0' has been deleted

这时develop分支回合并到master分支, 并打tag. 之后我们只要把master和tag都推到远端仓库即可.

## Hotfixing production code
紧急bug修复, 在已经发布的代码上更正. 会从master开出hotfix分支, 然后合并回master, 也会合并回develop.

    $ git flow hotfix start assets
    Switched to a new branch 'hotfix/assets'

    Summary of actions:
    - A new branch 'hotfix/assets' was created, based on 'master'
    - You are now on branch 'hotfix/assets'

    Follow-up actions:
    - Bump the version number now!
    - Start committing your hot fixes
    - When done, run:

        git flow hotfix finish 'assets'

然后修改问题, 之后提交:

    $ git flow hotfix finish assets
    Switched to branch 'master'
    Merge made by the 'recursive' strategy.
    assets.txt | 1 +
    1 file changed, 1 insertion(+)
    create mode 100644 assets.txt
    Switched to branch 'develop'
    Merge made by the 'recursive' strategy.
    assets.txt | 1 +
    1 file changed, 1 insertion(+)
    create mode 100644 assets.txt
    Deleted branch hotfix/assets (was 08edb94).

    Summary of actions:
    - Latest objects have been fetched from 'origin'
    - Hotfix branch has been merged into 'master'
    - The hotfix was tagged '0.1.1'
    - Hotfix branch has been back-merged into 'develop'
    - Hotfix branch 'hotfix/assets' has been deleted

> 在往下阅读之前, 你最好将以上的命令实践一遍, 感受git-flow的操作与分支流向. 推荐SourceTree来跟踪变化.

## 减少以及消灭无用的merge commit
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

> 修改完冲突, 我们会进行commit提交冲突修改. **不要使用`git commit -m`, 请直接使用`git commit`, git会识别你这是一个冲突提交.**


> 当然, 操作的疏忽依然会产生无意义的commit, 但这并不致命, 注意就好.

> 如果真的要消灭无意义commit: 在你`git pull`之后发现自动合并了, 那么用`git reset --hard [刚刚你本地的提交commit version]`进行本地版本回滚, 然后再`git pull --rebase`

> 我对rebase的理解也不是很多, 以上只是应用中的使用体会, 肯定还存在很多没有想到的情况和处理不当的地方, 请大家多提出来指正, 共同讨论.

## 参考
* [http://jeffkreeftmeijer.com/2010/why-arent-you-using-git-flow/](http://jeffkreeftmeijer.com/2010/why-arent-you-using-git-flow/)
* [https://git-scm.com/book/zh/v1/Git-分支-分支的衍合](https://git-scm.com/book/zh/v1/Git-分支-分支的衍合)