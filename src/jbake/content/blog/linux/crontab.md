+++
date = "2016-02-08T23:20:32+08:00"
draft = false
title = "crontab介绍"
categories = [ "linux", "crontab" ]
type="linux"
+++
#### 转载, 记在笔记中, 出处找不到了.

#### 名称 : crontab

使用权限 : 所有使用者

使用方式 :

    crontab [ -u user ] file
    crontab [ -u user ] { -l | -r | -e }
### 说明 :
<!-- more -->


crontab 是用来让使用者在固定时间或固定间隔执行程序之用，换句话说，也就是类似使用者的时程表。-u user 是指设定指定 user 的时程表，这个前提是你必须要有其权限(比如说是 root)才能够指定他人的时程表。如果不使用 -u user 的话，就是表示设定自己的时程表。

### 参数 :
    -e : 执行文字编辑器来设定时程表，内定的文字编辑器是 VI，如果你想用别的文字编辑器，则请先设定 VISUAL 环境变数来指定使用那个文字编辑器(比如说 setenv VISUAL joe)
    -r : 删除目前的时程表
    -l : 列出目前的时程表
#### 时程表的格式如下 :

    f1 f2 f3 f4 f5 program

  其中 f1 是表示分钟，f2 表示小时，f3 表示一个月份中的第几日，f4 表示月份，f5 表示一个星期中的第几天。program 表示要执行的程序。

  当 f1 为 * 时表示每分钟都要执行 program，f2 为 * 时表示每小时都要执行程序，其馀类推

  当 f1 为 a-b 时表示从第 a 分钟到第 b 分钟这段时间内要执行，f2 为 a-b 时表示从第 a 到第 b 小时都要执行，其馀类推

  当 f1 为 */n 时表示每 n 分钟个时间间隔执行一次，f2 为 */n 表示每 n 小时个时间间隔执行一次，其馀类推

  当 f1 为 a, b, c,... 时表示第 a, b, c,... 分钟要执行，f2 为 a, b, c,... 时表示第 a, b, c...个小时要执行，其馀类推

  使用者也可以将所有的设定先存放在档案 file 中，用 crontab file 的方式来设定时程表。


### 例子:

    0 */2 * * * /sbin/service httpd restart  意思是每两个小时重启一次apache
.

    50 7 * * * /sbin/service sshd start  意思是每天7：50开启ssh服务
.

    50 22 * * * /sbin/service sshd stop  意思是每天22：50关闭ssh服务
.

    0 0 1,15 * * fsck /home  每月1号和15号检查/home 磁盘
.

    1 * * * * /home/bruce/backup  每小时的第一分执行 /home/bruce/backup这个文件
.

    00 03 * * 1-5 find /home "*.xxx" -mtime +4 -exec rm {} \;
    每周一至周五3点钟，在目录/home中，查找文件名为*.xxx的文件，并删除4天前的文件。
.

    30 6 */10 * * ls  意思是每月的1、11、21、31日是的6：30执行一次ls命令