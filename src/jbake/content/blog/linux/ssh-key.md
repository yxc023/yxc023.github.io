= 利用ssh-key免密码访问远程主机
杨晓辰
2016-04-14
:toc: left
:toclevels: 4
:icons: font
:jbake-sid: ssh-copy-id
:jbake-type: post
:jbake-tags: linux
:jbake-status: published

## 命令

    ssh-keygen

    ssh-copy-id -i ~/.ssh/id_rsa.pub yangxiaochen@XXXXXX

<!-- more -->

## mac

什么? 你用mac? 拿走不谢.

    brew install ssh-copy-id

## 注意

尽量不用手动拷贝 id_rsa.pub 到目标机器, 拷贝之后的文件权限值不对也不能访问. 附送解决方案:

    chmod 600 authorized_keys
