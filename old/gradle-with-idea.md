+++
date = "2017-03-28T16:19:32+08:00"
draft = false
title = "论Gradle与IDEA的使用"
categories = [ "java", "gradle" ]
type="java"
payable="true"
+++

# 论Gradle与IDEA的使用

## 前言

gradle 是一个相对比较新的构建工具, 相对使用人群较少, 略有入门门槛, 但是用了之后比较好用的工具.

当然使用中有一些坑, 而且跟 IDEA 配合使用中也会遇到很多问题. 本文就是把我使用过程中遇到的问题做一下总结, 大家对症下药.

持续更新中...
<!-- more -->

## 常规使用

### 创建项目

创建 gradle 的项目非常简单,  「new」-> 「project」-> 选择 Gradle 项目

### 引入已有项目

如果已有 gradle 项目, 即文件中有 build.gradle 构建文件. 「open」build.gradle 文件即可.

### 在非gradle项目中加入gradle

一个项目已经打开, IDEA 里却没有 gradle 标签栏.

「Configura project structure」-> 「Modules」-> add -> 「Import Modules」, 将 build.gradle 文件引入.

### 修改gradle文件后, 更新项目. 这里是重点哦

如果是按照上面的步骤导入的项目, 那么在更新完`build.gradle`文件后, 需要点击 IDEA 右侧 tab 中 gradle 的标签, 然后点击刷新. 这个目的是让 IDEA 识别`build.gradle`中的配置, 根据配置重新组织项目结构, 包括 module, libs 等, 以便让 IDEA 配合我们工作.   

这时候, 有时会出现点击刷新后, 进度条迟迟走不完, 一直停留在 build 状态. 没有错误原因, 也不停止, 这是令我们最沮丧的, 下面就是要说一说 build速度慢, 或者无响应的问题.

## 常见问题

### 插件选择

配合 IDEA 使用, 请使用

```
apply plugin: 'idea'
```

通过这个插件, 

1. 我们可以设置一些参数, 让 IDEA 刷新的时候识别到, 从而能够做一些我们的配置. 
2. 可以命令行手动运行 `gradle idea` 命令, 来看看刷新过程是不是有问题.
3. `gradle idea`命令会生成`.iml`项目文件, IDEA 通过打开这个文件也能够正确引入这个项目. 但我们很少这么做.

除了内置插件外, 可以 [Search Gradle plugins](https://plugins.gradle.org/).

### build速度慢

#### 替换仓库

首先来说可以替换`repositories`, 使用阿里云的仓库

```
repositories {
  maven {
  	url "http://maven.aliyun.com/nexus/content/groups/public"
  }
}
```

再者, 有的同学使用私服, 可能是公司搭建的. 这个有时候会有不稳定, 且有时需要认证的情况. 看稍后的章节.

#### 如何debug

gradle 运行中的提示并不算很友好, 尤其在链接仓库和下载jar包时, 在连接有问题的时候, 经常没有提示(新版本的可能好一些.)

经常使用

```
gradle idea -i
gradle idea -id

还可以加入 --no-daemon 参数来避免daemon启动产生的日志干扰
gradle idea -id --no-daemon
一般来说就能定位到构建问题.
```

来获取更多的信息. 比较常见的卡住是因为`仓库链接不上`, `jar包下载链接不上, 又不返回 response (私有仓库偶尔有问题)`, `资源下载缓慢`, `仓库需要认证登陆`

* 仓库连接不上: 检查仓库地址, 检查网络.
* 资源无法连接又没有response: 这种通常会在上面打出的日志中体现, 请求一个 url 便没有响应.
* 下载缓慢: 更换仓库, 或者忍耐下第一次, 以后会好很多

在 IDEA 刷新有问题时, 可以执行这个命令debug, 一般这个命令能成功, 那么 IDEA 刷新通常也能成功. (请注意版本问题, 命令行里执行的 gradle 版本需要跟 IDEA 里配置的 gradle 版本一致)

#### 私服使用和包管理混乱引起的问题

私服使用中会有以下问题: 

1. 不稳定, 偶尔服务无响应.

2. 配置出错, 无法 proxy maven 主仓库. 或者出现私服中存在第三方包但是却不完整到时无法下载.

   一般来说会尝试把第三方仓库配置到私服之前:

   ```
   maven {
     url "http://maven.aliyun.com/nexus/content/groups/public"
   }

   maven {
     url "http://你家私服地址/"
     credentials {
       username "xxx"
       password "xxx"
     }
     authentication {
     	basic(BasicAuthentication)
     }
   }
   ```

   这样先去第三方查找, 再到私服查找.

3. 私服有认证. 可以参照第二条私服的认证方式. 其中

   ```
     authentication {
     	basic(BasicAuthentication)
     }
   ```

   是可选填的, 不填的话会自动识别认证方式.

4. 打包方式不完整. 有的同学上传包的时候虽然包含了编译后的jar包, pom文件, 但是有时却没有把source包上传, gradle 默认是会下载source的, 如果没有, 私服返回404还好, 最怕会卡主(遇到过私服虽然没有这个文件却迟迟不返回response的情况.), 所以, 如果遇到这种问题, 可以: 

   ```
   idea {
   	module {
   		downloadJavadoc = false
   		downloadSources = false
   	}
   }
   ```

   不让 IDEA 刷新的时候下载源码和文档, 万不得已还是不要用.

### 常用命令或参数

`--refresh-dependencies`   刷新依赖

`gradle tasks` 列出所有可执行的task

`gradle tasks --all` 列出所有可执行的task, 并附加上 mudole

`gradle help --task taskName`  查看一个task的帮助, 不过并不是所有task都有, 因为task都是可以自己来实现的.

`gradle idea -id` 用来debug IDEA进行刷新时遇到的问题, 一般这个任务能成功, 刷新就能成功. 注意使用的 gradle 版本要一致.

`--no-daemon` 不是使用daemon进行构建. daemon的作用是不用每次 build 都再启动一个进程, 节省时间. 但却会在我们 debug 问题的时候不停的生产日志, 产生干扰.

### 依赖冲突处理

可以通过命令来查看一个项目的依赖

```shell
gradle webapp:dependencies --configuration=compile
```

gradle 依赖使用的是 最近 原则. 比如你构建处于依赖顶层的 module , 那么版本会优先使用这个顶层module 的`build.grale` 中定义的版本. 所以可以在顶层module 中强制定义版本

依赖排除, 通常可以使用

```
compile("org.springframework.boot:spring-boot-starter-web") {
    exclude module: "spring-boot-starter-logging"
}
```

这样的语法, 还有更为粗暴直接的: 

```
configurations {
    all*.exclude group: 'ch.qos.logback', module: 'logback-classic'
    all*.exclude group: 'ch.qos.logback', module: 'logback-core'
}
```

### 遇到过的bug

#### compile依赖被idea设置为provide

IDEA 2017 以前版本在使用 gradle 3.4+ 版本时, 刷新后 compile 的依赖会被解释为 provide依赖. 在使用 IDEA 运行程序的时候会报 ClassNotFound 之类的错误.

### 最佳实践总结

1. 尽量用最新版本的 IDEA 和 Gradle, 截止到目前, 是 IDEA 2017.1 和 gradle 3.4.1
2. 遇到问题用 `gradle idea -id` 来debug
3. 尽量排除 deamo 日志的干扰
4. 通过命令行使用`gradle`, 速度快, 可以检测问题.