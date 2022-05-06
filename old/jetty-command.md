+++
date = "2016-02-09T06:19:32+08:00"
draft = false
title = "jetty常用命令"
categories = [ "jetty","java" ]
type="java"
+++

## 创建jetty base

    java -jar $JETTY_HOME/start.jar --add-to-startd=http,deploy,logging,requestlog
<!-- more -->

## start.sh

    #!/usr/bin/env bash

    if [ -f "main.pid" ]; then
    main_pid=`cat main.pid`
    count=`ps aux | grep $main_pid | wc -l`
    if [[ $count -gt "1" ]]; then
    ps aux | grep $main_pid
    echo "进程好像已经在运行了..."
    exit
    fi
    fi

    nohup java -jar ../../start.jar STOP.PORT=18090 STOP.KEY=autoDispatch >/dev/null 2>&1 &
    echo $! > main.pid
    echo "start at pid:" `cat main.pid`

## stop.sh

    #!/usr/bin/env bash

    if [ -f "main.pid" ]; then
    main_pid=`cat main.pid`
    count=`ps aux | grep $main_pid | wc -l`
    echo "stop" $main_pid
    java -jar ../../start.jar —stop STOP.PORT=18090 STOP.KEY=autoDispatch
    fi

## xml配置

    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE Configure PUBLIC "-//Jetty//Configure//EN" "http://www.eclipse.org/jetty/configure_9_0.dtd">

    <Configure class="org.eclipse.jetty.webapp.WebAppContext">
        <Set name="contextPath">/</Set>
        <Set name="war">webapps/intelligent-dispatch.war</Set>
        <Set name="extractWAR">false</Set>
    </Configure>