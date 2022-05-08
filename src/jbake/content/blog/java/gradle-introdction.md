title=gradle教程
date=2017-07-24
type=wiki_gradle
tags=blog
status=published
~~~~~~

## 前言

本文没有 gradle 与 maven 对比，也没有深入 gradle 实现。只有 gradle 从 0 开始使用的说明。

* 简介
* 安装
* 新建一个 gradle 项目
* 引入一个 gradle 项目
* 常见问题
* 交流

<!-- more -->

## 简介

gradle 是一个构建工具。负责管理项目依赖，组织项目结构，完成项目构建的工作。

## 安装

从 官网 下载，解压即可，并将 bin/gradle 命令加入到 path 中。

## 新建一个 gradle 项目

1. 新建一个文件夹作为项目文件夹

   ```
   mkdir project-example
   cd project-example
   ```

2. 使用 gradle 初始化

   ```
   gradle init
   ```

   然后目录下会生成这些文件

   ```
   build.gradle // 构建脚本文件，主要的构建配置都在这里写
   gradle // 存放gradle wrapper 执行配置和工具的文件夹，
   gradlew // gradle wrapper 执行脚本文件，用来在没有安装 gradle 的情况下执行 gradle 命令。当然，第一次执行时会下载 gradle。
   gradlew.bat // gradle wrapper 执行脚本文件的 windows 版
   settings.gradle // 项目配置，指明根项目名字和引入的 module
   ```

3. 修改 build.gradle 文件，结果像下面这样

   ```
   /*
   声明插件，声明插件的方式有两种，下面这种是 2.* 版本之后的新的定义方式。可以声明两种插件：
   1. 官方内置插件，如 java，idea。
   2. 在 gradle 插件中心注册过的插件，如第三个就是，这种要还要声明版本。
   声明插件的目的是因为插件会提供很多 task，而每一个 task 就是一段构建脚本，可以执行不同的任务。比如 compileJava，test 等。
   */
   plugins {
       id 'java'
       id 'idea'
       id "com.yangxiaochen.scaffold" version "1.0.2"
   }

   /*
   声明 group 和 版本，而 project 的名字在 settings.gradle 文件中，而子 module ，或者又称为 sub projects 的名字通常和文件夹名字一样。
   */
   group 'com.yangxiaochen.gradle'
   version '1.0.0-SNAPSHOT'

   /*
   声明依赖仓库，这里使用的是 jcenter，也可以使用其他的如 mavenCentral 等。也可以声明多个，会按顺序查找。
   */
   repositories {
       jcenter()
   }

   /*
   声明依赖
   */
   dependencies {
       compile 'org.slf4j:slf4j-api:1.7.21'
       testCompile 'junit:junit:4.12'
   }
   ```

   编辑 settings.gradle 文件如下，声明了project name
   ```
   rootProject.name = 'project-example'
   // include 'sub-project'
   ```

4. 引入到 Idea IDE 中
   ```
   gradle idea
   ```

   目录下新生成了三个文件

   ```
   project-example.iml
   project-example.ipr
   project-example.iws
   ```

   接下来只要用 Idea IDE 来 open project-example.ipr 文件，就可以引入 project 了， 之后每当
   1. 依赖更改

   2. 目录结构更改

   只要执行 `gradle cleanIdea idea` 就可以刷新这三个文件，Idea IDE 就会重新加载识别项目了。

   > 我的经验是不要使用 Idea IDE 来直接用 build.gradle 来打开文件，因为 Idea IDE 在解析 build.gradle 文件时有其他操作，而且 Idea IDE 与 gradle 版本有时会不太兼容，导致项目解析错误；而使用 gradle 来生成 Idea IDE 工程文件的方式就不会有问题，而且速度更快，更容易debug。

5. 引入之后，还需要生成 src 文件夹和 sub project

   ```
   gradle createSrc idea
   gradle createModule --name foo idea
   ```

   `createSrc` 和`createModule`都是插件 `com.yangxiaochen.scaffold`里的 task，而 `idea`和`cleanIdea` 是插件 `idea`提供的 task

## 引入一个 gradle 项目

跟上一节创建一个 gradle 项目类似，引入`idea`插件，然后生成 Idea IDE 的工程文件，再 open 即可

## 常见问题

### 插件选择

内置插件都在官方文档中有说明，除了内置插件外, 可以 [Search Gradle plugins](https://plugins.gradle.org/)，gradle 插件的官方仓库。

### build速度慢

速度慢一般来说是依赖更新慢，因为众所周知的原因，国内使用国外的仓库速度并不乐观，所以可以替换`repositories`, 使用阿里云的仓库

```
repositories {
  maven {
  	url "http://maven.aliyun.com/nexus/content/groups/public"
  }
}
```

再者, 有的同学使用私服, 可能是公司搭建的. 这个有时候会有不稳定, 且有时需要认证的情况. 看稍后的章节.

### 如何debug

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

### 私服使用和包管理混乱引起的问题

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

`--refresh-dependencies`   刷新依赖，刷新那些SNAPSHOT的依赖，类似于 maven 的 -U 参数

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

不同于maven的**最近**原则，gradle 依赖使用的是**最新**原则. 比如你构建处于依赖顶层的 module , 那么版本会优先使用这个顶层module 的`build.grale` 中定义的版本. 所以可以在顶层module 中强制定义版本

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
## 参考资料

官方文档相当的详细，且附有很多example，配合 gradle 安装包里的 example 源文件阅读

## 交流

欢迎加入群 536890082，gradle，spring，activiti 交流