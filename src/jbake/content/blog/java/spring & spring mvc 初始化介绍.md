title=spring & spring mvc 初始化介绍
date=2017-03-30T19:19:32+08:00
type=post
tags=java, spring
status=published
~~~~~~


<!-- # spring & spring mvc 初始化介绍 -->

## web项目的结构

### java servlet 技术

java servlet 技术是 java 的一个 web 服务规范, 提供了统一的 servlet api 供各个容器厂商实现, 以保证一个 java web 项目可以运行在不同厂商的服务器下.

请看实例简单复习下 servlet, listner, filter

listner, filter 会在 web 容器启动时执行 init 方法 

servlet 会在第一次访问时进行初始化. 当然也可以设置 init on start
<!-- more -->


### 非 servlet 规范的 java web 项目

使用netty作为服务器lib, 加入 http 协议的处理层,  自行完成处理 http 请求读写

### spring mvc 的的封装

我们最常用到的 spring mvc 框架就是对 servlet 技术的封装, 在 web.xml 中加入实现 `Listenner` 的 `SpringContextListener` 和实现了 `Servlet` 的 `DispatcherServlet`, 来对spring 和 spring mvc 进行初始化. 

## spring context 结构

spring context 是整个 spring 的核心, 通常也被叫做 spring 容器. 通常讲的 spring 初始化过程, 就是初始化 spring context 的过程.

根据应用不同, 使用的 spring  context 类型也不同

### 继承树

![context继承.png](http://img.yangxiaochen.com/image/blog/context继承.png)



常见的 war 包形式的 web 应用, 使用的是 `XmlWebApplicationContext`

spring boot 默认使用的是 `AnnotationConfigEmbeddedWebApplicationContext`

### 重要组件

* `BeanFactory` 通用组件, 负责 bean 注册和初始化
* `Environment` 通用组件 , 包含系统参数, 启动参数等. 还有对启动参数解析后的属性, 比如 profile
* `ApplicationListener`s 通用组件, 保存注册进来的context事件listener
* 一些 context 状态标志, parent
* `ServletContext`, `ServletConfig` WebApplicationContext类里特有的


* 一些特定的参数. 在特定context类型中, 比如

```java
/** Default config location for the root context */
public static final String DEFAULT_CONFIG_LOCATION = "/WEB-INF/applicationContext.xml";

/** Default prefix for building a config location for a namespace */
public static final String DEFAULT_CONFIG_LOCATION_PREFIX = "/WEB-INF/";

/** Default suffix for building a config location for a namespace */
public static final String DEFAULT_CONFIG_LOCATION_SUFFIX = ".xml";	
```



## spring context 初始化过程概念概览

一个 spring context 的初始化过程大致分为以下几个阶段:

1. 读取并设置系统参数, 环境变量, 获取一些初始化 context 需要的组件, 比如 ApplicationContextInitializer 等.

   这个属于context 初始化的前置逻辑, 由应用自己控制, 我们也可自己来写, 用来给后面 context 初始化做准备

   这一步根据应用不同差别很大, 比如传统 war 包的 ContextLoadListner 和 spring boot 的 SpringApplication 中的逻辑就很不同.

2. create context

   根据应用不通, 创建不同的 context

3. configure context

   用第1步获得的参数和组件, 来配置创建好的 context

4. context.refresh

   核心步骤, context 初始化的具体过程就在这里. 

   包括分门别类的加载各种特殊的 bean, 然后加载普通的ben 


## spring 初始化过程实例概览(非 spring boot 的传统war包)

### ContextLoaderListener

`ContextLoaderListener` 配置在 web.xml 中, 在容器启动时初始化.

![ContextLoaderListener.png](http://img.yangxiaochen.com/image/blog/ContextLoaderListener.png)



部分较为重要步骤解释:

* 3) 决定spring web app context类型. 不指定的情况下默认策略创建 `XmlWebApplicationContext`

* 16) 以 bean 的 configuration 文件, 就是一般我们说的xml文件 为入口, 加载 `BeanDefinition` 到 bean factory. 注意仅仅是加载 bean 的描述, 而没有实例化这些 bean

* 17) 实例化执行所有的 `BeanFactoryPostProcessor`, 从 `BeanDefinition` 中和 context 的 `beanFactoryPostProcessors` 字段中查找.

* `BeanFactoryPostProcessor`是意图在 bean factory 加载了所有定义的 bean 定义之后, 且在这些 bean 实例化之前, 做一些操作.

  这一步通常在调用各个 processor 时, 产生新的 bean 定义到 bean factory

* 18) 注册 `BeanPostProcessor` , 从 `BeanDefinition` 中查找.

* `BeanPostProcessor` 会在之后每个 bean 实例化之后调用, 用来对 bean 做一些其他操作, 比如放入一些参数: 

  像 `AutowiredAnnotationBeanPostProcessor` 的作用就是注入 `@Autowired` 字段.

  生成动态代理对象也是通过  `BeanPostProcessor` 实现的.

* 21) `onRefresh ` 是用来初始化其他的特殊的 bean, 这部分逻辑通常在特殊的 context 子类实现

  比如在 spring boot 中使用的 `AnnotationConfigEmbeddedWebApplicationContext` 中, 会在这里初始化并启动内嵌服务器 

* 22) 将在  `BeanDefinition` 中的, 还有之前设置到context属性中的  `ApplicationListener` 加到广播列表中

* 23) 将  `BeanDefinition`  中其他的非懒加载的 bean 实例化.

* 24) 实例化并调用 `LifecycleProcessor` , 然后广播 `ContextRefreshedEvent`

* 26) 将 context 放到 `ServletContext` 的 attribute 属性里, 之后 `DispatcherServlet` 初始化会用到

> *以上说的 bean 均为 singleton 的 scope

### DispatcherServlet

`DispatcherServlet` 配置在 web.xml 中, 在第一次访问时初始化.

![DispatcherServlet.png](http://img.yangxiaochen.com/image/blog/DispatcherServlet.png)

部分较为重要步骤解释:

* 5) 以 `ContextLoaderListener`创建的 context 为 parent, 创建新的 `XmlWebApplicationContext`
* 8) 创建一个 `ContextRefreshListener` , 加入到 context 中, 监听 `ContextRefreshedEvent`
* 9) refresh 过程跟`ContextLoaderListener` 一样, 不同的是在查找 bean 时, 能够查到 parent context 的 bean, 供新的 context 初始化使用.
* 10) 触发  `ContextRefreshedEvent` , 初始化 spring mvc 的组件, 添加到 `DispatcherServlet` 中.

## 一些特殊类型Bean的初始化时机 (待完善, 请持续补充)

### BeanFactoryPostProccesor

context refresh 之后, 初始化好 factory 之后, 会先执行 context 自身的 factory post 操作, 然后就会执行  `BeanFactoryPostProccesor`  这种类型 bean 所定义的 factory post 操作.

### BeanDefinitionRegistryPostProcessor

`BeanFactoryPostProccesor` 的子类, 执行优先级比 `BeanFactoryPostProccesor` 要高. 通常可以通过 order 来控制`BeanDefinitionRegistryPostProcessor` 类型的执行顺序, 还跟这个 bean 定义的时机有关, 在 prepare context 阶段定义的总会最先执行.

通常自定义的 xml 和 bean 配置 会在这个阶段被定义到 factory.  

### BeanPostProccesor

在 `BeanFactoryPostProccesor` 都执行完之后实例化, 并 apply 到 factory ,  在一个 bean 初始化之后会被调用.

### Aware

如 `ApplicationContextAware` , 实现这个接口的 bean 会由一个 `BeanPostProccesor` 类型的  `ApplicationContextAwareProcessor` 在初始化之后 set 一个 application context

Aware 相关类的很多, 都类似

### ApplicationListener

用来监听 context 生命周期中各个事件的类, 可以在 prepare 和 refresh 阶段注入

### ApplicationContextInitializer

prepare context 阶段执行, 在 context refresh之前执行. 可以对 context 注入 `BeanFactoryPostProccesor` 和 `ApplicationListener`

