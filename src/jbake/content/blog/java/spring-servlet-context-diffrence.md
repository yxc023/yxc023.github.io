+++
date = "2016-02-09T08:19:32+08:00"
draft = false
title = "spring servlet.xml 与 application context.xml 不同"
categories = [ "spring","spring mvc","config","context" ]
type="develop"

+++

参考 http://stackoverflow.com/questions/3652090/difference-between-applicationcontext-xml-and-spring-servlet-xml-in-spring

Spring lets you define multiple contexts in a parent-child hierarchy.

The applicationContext.xml defines the beans for the "root webapp context", i.e. the context associated with the webapp.
<!-- more -->

The spring-servlet.xml (or whatever else you call it) defines the beans for one servlet's app context. There can be many of these in a webapp, one per Spring servlet (e.g. spring1-servlet.xml for servlet spring1, spring2-servlet.xml for servlet spring2).

Beans in spring-servlet.xml can reference beans in applicationContext.xml, but not vice versa.

All Spring MVC controllers must go in the spring-servlet.xml context.

In most simple cases, the applicationContext.xml context is unnecessary. It is generally used to contain beans that are shared between all servlets in a webapp. If you only have one servlet, then there's not really much point, unless you have a specific use for it.