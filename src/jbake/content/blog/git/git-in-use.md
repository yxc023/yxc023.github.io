title=git实际开发语句
date=2016-07-04T21:52:32+08:00
type=post
tags=git
status=published
~~~~~~


<!-- # git实际使用指南 -->

## dev上工作git指南
1. 切到`dev`分支

        git checkout dev

2. 开分支

        git checkout -b bug/JRTE-333-问题描述

    或者

        git checkout -b feature/JRTE-333-需求描述

3. 开发

        .....


<!-- more -->

4. 提交分支

        git push origin [你的分支名字]

5. 发起`merge request`

        登陆git.lianjia.com发起

6. 如果一切正常, 就结束了. 如果发现`merge request`有冲突, 不能合并, 转 `7`

7.  `merge request`有冲突

    1. 切换到`dev`, 更新之.

            git co dev
            git pull

    2. 切回你的分支.
        
            git co [你的分支名字]

    3. rebase! 难以理解而又复杂的一步. 但做过一次你就会了! 

        进行rebase

            git rebase dev
            
        `git rebase dev` 的意思是将`你的分支`上的每一次提交, 应用到`dev`分支的尾部.

    4. 如果提示有冲突, 转`7.5`. 如果没有冲突:

        因为你push过你的分支, 所以`远程你的分支`和`本地你的分支`已经不一致了. 所以强行覆盖`你的远程分支`

            git push -f origin [你的分支名字]

        然后你就发现你的`merge request`显示可以自动合并了. 

    5. 解决冲突, 然后根据提示执行:

            git add [冲突文件]
            git rebase --continue
    
        如果还有冲突, 转`7.5`, 如果没有, 转`7.4`.


## 如果出现以下情况, 很有可能你就错了
* 把`dev`上的代码merge到分支:

        git merge dev

* 在`dev`上merge分支代码

* 在dev上执行`git pull`发现不是`fast forward`

* 在任何分支上执行`git pull`发现不是`fast forward`


## 合并为一次提交
### 方法一

    git reset [分支开始version]
    git add .
    git commit

### 方法二, 保证没有冲突, 且合并为一次提交!
在`4. 提交分支` 时, 先更新`dev分支`, 然后在`你的分支`执行

    git rebase dev -i

 把除了第一个`pick`全改成`s`或者`squash`. 提示很全, 试试吧.