+++
date = "2016-02-09T05:19:32+08:00"
draft = false
title = "linux进程pid"
categories = [ "linux","pid" ]
type="linux"

+++

Linux 下启动Java程序一般是执行命令：

    java -cp ${CLASSPATH} org.self.test.Main

而停止一个程序需要执行命令：

    kill ${PID}

只有这个启动命令你不能直接得到这个Java进程的PID，但是可以通过jps 或 ps 命令间接的查到，然后在执行kill命令。

有些程序则是启动的时候直接生成一个.pid文件，这样kill的时候就直接读取这个文件就好了。命令：

    java -cp ${CLASSPATH} org.self.test.Main
    echo $! > main.pid
    kill `cat main.pid`