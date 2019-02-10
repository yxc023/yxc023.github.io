title=Java web 项目异常设计实践
date=2017-07-10T10:19:32+08:00
type=post
tags=java, exception, web
status=published
~~~~~~

# 异常实践

## 前言

本文是我在项目中设计和处理异常的一些实践，主要是围绕着常见的web项目，欢迎大家指正。

本文分为两个个部分

1. 异常设计
2. 异常处理
<!-- more -->

## 异常设计

通常考虑异常设计时大致分为三个部分

1. 接口层
2. 业务层
3. 类库

接口层就是我们通常说的 controller 层，以及提供 rpc 服务的接口层。

业务层就是主要的业务代码模块，主要是 service 层。

类库主要是指一些公共模块，可以在各个项目中使用的，比如 json，分布式锁等。

### 业务层

在业务层，我们主要是要设计**业务异常**。什么是业务异常？业务异常就是我们能够人为的判断出业务逻辑走到某一个位置是不对的。比如，我们要根据一个 uid 来修改一个 user 的 name，但我们发现并没有这个 uid 对应的 user 数据，这时候就应该抛出一个业务异常。在发生业务异常时，要避免抛出 npe，RuntimeException 等其他内置异常，以方便上层来分辨到底是业务错误还是程序 bug。

我一般会设计一个业务异常的基类 `ServiceException`，将所有业务异常以这种类型来抛出，并带有必要的 message。

为了把用户可读的消息和开发人员可读的消息区别开，`ServiceException` 还需要实现一个接口 `UserMessage`，并实现其中方法 `getUserMessage()`来返回用户可读的信息，而 getMessage() 可以携带更详细的开发人员可读的错误信息

设计一个 `ServiceErrorException`，继承 `ServiceException`。`ServiceErrorException` 的主要目的是为了表明这个异常的错误程度高，需要记录 error。

以上就定型了业务异常的基本结构，上面一些特殊设计会在**异常处理**中用到，我们后面来说，再做前后对照。我们可以根据需要来实现若干子类来表示业务层中不同模块的错误。

### 接口层

对于接口层，特别是rpc调用，比如我们的dubbo调用，需要把api的jar包放在调用方。我们需要把异常类给包括进去，但调用方不能也不应该拿到我们业务层的 `ServiceException`，所以需要在接口层定义新的业务异常类型，比如，就叫`ApiServiceException`，放在api的jar包里给调用方。

接口实现需要把业务层的`ServiceException`给catch到，重新封装为`ApiServiceException`抛出。

这样，调用方在判断调用时发生的异常时，有三种可能：

1. rpc框架异常。比如又dubbo框架抛出的异常，这一版两种可能：1. 网络异常，我们需要重试；2. 调用未能达成，这种一般是接口没有匹配上，在开发测试时都可以发现的错误，改掉即可。所以，当发生rpc框架异常时，调用方的策略就应该是重试。
2. ApiServiceException。这表示被调用方出现了业务异常，调用方也需要作为业务异常来处理。
3. 其他异常。这表示被调用方的程序有bug报出了异常透传给了调用方，这是调用方应及时联系接口实现方来修补bug。

以上，就能够分类准确应对rpc过程中的异常情况。

http方式的接口层也可以这么做，不过由于api并不对外，所以也可以完全由自身来处理异常类型，详见**异常处理**部分。

### 类库

作为类库，因为通常没有业务意义，所以在发生逻辑上的异常时，根本不可能知道需要怎么处理，这就需要直接向上抛出，到交给业务层处理。

类库需要将自身的逻辑上的异常，同一封装。比如，处理 Json 的类库，异常最终抛出时，都被封装成为`JsonParseException` 或 `JsonSerializeExcption`。

这样调用方使用类库时，异常会有两种：

1. 类库封装的自定义异常。这种是调用时出现的逻辑错误，调用方以业务异常来处理。
2. 其他异常。可以认为是类库bug。

## 异常处理

有了以上的异常设计，那么处理时就可以按照以下流程。

以 http 请求的 ExceptionHandler 为例，所有 http 请求异常都会放在这里处理，过程：

1. ex 异常传入。
2. 装饰 ex 异常，`ex = new WebApiException(...,ex)`，其包含有 `message`，`isLogError` 属性
   1. 如果 ex 是非 `ServiceException`，那么`message = “系统内部错误”`，`isLogError = true`。
   2. 如果 ex 是 `ServiceException`，那么`message = ex.getUserMessage()`；更进一步，如果是 `ServiceErrorException`，那么`isLogError = true`，否则 `isLogError = false`。
3. 如果 `ex.isLogError == true`，记录 error log，否则，记录 warn log。
4. 判断 http 请求是页面请求，还是ajax请求。
   1. 如果是页面请求。500转错误页，显示 `ex.getMessage()`，如果是debug环境或者是请求带有debug参数，也把错误堆栈输出在页面上。
   2. 如果是 ajax 请求。返回表示错误的 json 消息，同样，如果是debug环境或者是请求带有debug参数，消息中带上堆栈信息。


以上，就是一个简单而有效的异常处理机制。





