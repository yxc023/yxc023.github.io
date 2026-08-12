---
title: 用代码实现领域驱动模型的一些实践
date: 2024-09-29
description: 用代码实现领域驱动模型的一些实践
tags:
  - java
  - ddd
---
## 前言

领域驱动设计（Domain-Driven Design，DDD）是一种软件设计方法，它强调将软件设计建立在对业务领域的深入理解之上。DDD 的核心是领域模型，它是对业务领域的抽象和建模，是业务领域的核心概念和规则的表达。领域模型是 DDD 的核心，它是软件设计的核心，是软件设计的基础。

如何实现领域驱动设计呢？本文将通过一个简单的示例来演示如何用代码实现领域驱动模型的一些实践。

## 正文

### 项目整体结构

[source, bash]
```
.
├── blueprint-api
├── blueprint-application
├── blueprint-inventory
├── blueprint-order
├── blueprint-product
├── blueprint-trade
├── build.gradle
├── gradle
├── gradlew
├── gradlew.bat
└── settings.gradle
```

#### 1. 一个 application 模块

.blueprint-application/src/main/java/com/yangxiaochen/blueprint
[source, bash]
```
.
├── api
│   ├── dubbo
│   │   ├── DubboExceptionHandler.java
│   │   └── order
│   │       └── OrderFacadeImpl.java
│   └── http
│       ├── ApiResult.java
│       ├── HttpApiException.java
│       ├── HttpApiExceptionHandler.java
│       └── order
│           └── OrderApiController.java
├── bootstrap                               // 启动入口
│   └── Application.java
├── config                                  // 配置
│   ├── db
│   │   └── DbConfig.java
│   └── mvc
│       ├── ApiConfig.java
│       └── WebConfig.java
├── controller                              // 请求处理
│   ├── callback
│   │   └── package-info.java
│   ├── manage
│   │   ├── page
│   │   │   └── package-info.java
│   │   └── web
│   │       └── package-info.java
│   ├── page
│   │   └── package-info.java
│   └── web
│       ├── Result.java
│       ├── exception
│       │   └── WebExceptionHandler.java
│       └── order
│           └── package-info.java
├── listener                                // 消息监听
│   └── MsgListener.java
└── scheduler                               // 定时任务
    └── OrderScheduler.java
```

主要是三个作用：
1. 启动入口
1. 配置
1. 应用端口层（接口，消息监听，定时任务等）

.接口的目录组织结构
****
1. 按照功能作用分
  - 服务接口 /api
  - 回调接口 /callback
  - 前端接口 /web、/manage、/h5 等

2. 前端接口中，按照对应的应用端不同：
  - manage  管理端
  - web     PC 端
  - h5      移动端     

3. 每个接口下面，按照业务功能划分
  - order
  - product
  - trade
  - inventory
  - ...

[NOTE]
> 划分1、2两点尤为重要：对于不同的功能和作用的接口，返回值结构、错误码、鉴权方式、日志、性能监控等都是不同的，所以需要分开处理。
> 
> 详见 https://blog.yangxiaochen.com/blog/design-and-thinking/api-design.html#_%E6%8E%A5%E5%8F%A3%E7%BB%84%E7%BB%87%E7%BB%93%E6%9E%84[项目接口设计实践]

****

#### 2. blueprint-modulexxx：领域层分领域建立不同的 module

```
blueprint-order
blueprint-product
blueprint-trade
```

领域之间建立依赖关系，如：交易领域依赖订单领域，商品领域，库存领域。

#### 3. 每个领域对外提供有限的服务

.blueprint-order/src/main/java/com/yangxiaochen/blueprint/order
```
.
├── OrderDomainFactory.java     // create order domain object
├── OrderFacade.java            // 提供 order 操作指令
├── OrderQueryFacade.java       // 提供 order 查询指令
```

1. 通过 facade 提供有限的操作指令
2. 依赖模块动过获取 order domain 充血模型，来完成操作指令

### 模块内部结构

![模块内部代码组织结构](/img/2024/0929-module-struct.png)

#### 1. 将 query 分离出来

模型设计时不要考虑列表查询。否则很容易干扰模型的结构，结果让模型设计跟随了一种特定的视图结构，脱离了领域模型的本质。

使用 query facade 来提供查询指令。

query 逻辑不要受限于代码分层，直接写 SQL 也是可以的。联表查询、分页查询、复杂查询等都可以在 query facade 中实现。也可以通过异构存储来查询数据。

query 是为特定的视图进行编码，基本不考虑复用性。如果视图是可复用的，那么 query 逻辑可以在不同的接口中调用。如果视图是不可复用的，那么完全可以新写一套特定的 query 逻辑。

[source, java]
```
public class OrderQueryFacade {
    
    DslContext dslContext;

    public List<OrderVo> queryOrderList() {
        return dslContext.selectFrom(ORDER)
                .leftJoin(ORDER_ITEM).on(ORDER.ORDER_ID.eq(ORDER_ITEM.ORDER_ID))
                .leftJoin(PRODUCT).on(ORDER_ITEM.PRODUCT_ID.eq(PRODUCT.PRODUCT_ID))
                .leftJoin(SKU).on(ORDER_ITEM.SKU_ID.eq(SKU.SKU_ID))
                .leftJoin(DISCOUNT).on(ORDER.DISCOUNT_ID.eq(DISCOUNT.DISCOUNT_ID))
                .fetch()
                .map(record -> {
                    OrderVo orderVo = new OrderVo();
                    orderVo.setOrderId(record.get(ORDER.ORDER_ID));
                    orderVo.setOrderNo(record.get(ORDER.ORDER_NO));
                    orderVo.setOrderStatus(record.get(ORDER.ORDER_STATUS));
                    orderVo.setOrderType(record.get(ORDER.ORDER_TYPE));
                    orderVo.setDiscount(new DiscountVo(record.get(DISCOUNT.DISCOUNT_CODE), record.get(DISCOUNT.DISCOUNT_NAME), record.get(DISCOUNT.DISCOUNT_AMOUNT));
                    orderVo.setItems(new OrderItemVo(record.get(PRODUCT.PRODUCT_CODE), record.get(PRODUCT.PRODUCT_NAME), record.get(SKU.SKU_ID), record.get(SKU.SKU_NAME), record.get(SKU.SKU_PROPERTIES), record.get(ORDER_ITEM.COUNT)));
                    return orderVo;
                });
        
    }
}
```

#### 2. 模块通过暴露领域对象和有限的领域服务来提供服务

##### 2.1 通过领域对象提供服务

领域对象是充血模型，它包含了属性和操作。

[source, java]
```
public class OrderDomain {
    private Long id;
    private Long userId;
    private Long productId;
    private Integer quantity;
    private BigDecimal amount;
    private Integer status;
    private Date createTime;
    private Date updateTime;

    transient private OrderService orderService;

    public void create() {
        orderService.createOrder(this);
    }

    public void pay() {
        orderService.payOrder(this);
    }

    public void cancel() {
        orderService.cancelOrder(this);
    }

    public void finish() {
        orderService.finishOrder(this);
    }
}
```

.领域对象如何创建
****
1. 领域对象的创建，可以通过工厂模式来创建。
+
领域对象内，包含了领域对象的数据，以及依赖的服务。通过工厂模式创建，将属性和依赖都注入到领域对象当中。
+
[source, java]
```
public class OrderDomainFactory {

    private OrderService orderService;
    private OrderRepository orderRepository;

    public OrderDomain getOrderDomain(Long orderId) {
        return new OrderDomain(orderId, orderService, orderRepository);
    }
}
```

2. 更多属性，使用懒加载的方式来加载。

3. 领域对象内的操作，可以代理给内部的 service 对象来处理。避免领域对象内部的逻辑过于复杂。
+
[source, java]
```
public class OrderDomain {

    private Long orderId;
    List<OrderItem> orderItems;
    private Integer status;
    private Long createTime;

    private transient OrderService orderService;
    private transient OrderRepository orderRepository;

    public OrderDomain(Long orderId, OrderService orderService, OrderRepository orderRepository) {
        this.orderId = orderId;
        this.orderService = orderService;
        this.orderRepository = orderRepository;
    }

    public void create() {
        orderService.createOrder(this);
    }
    
    public List<OrderItem> getOrderItems() {
        if (orderItems == null) {
            orderItems = orderRepository.getOrderItems(orderId);
        }
        return orderItems;
    }
}
```

****

.领域对象中的操作太多了？
****
领域对象内的操作太多，可以通过场景拆分，将不同的操作放到不同场景下的同一个领域对象中。

比如，OrderDomain，在创建订单的场景下：

1. 只有创建订单的操作
1. 订单的创建操作是逻辑是非常复杂的
1. 创建订单时，订单的模型并不完整，有的只是创建订单的参数

那么可以创造一个 CreatingOrderDomain，专门用来处理创建订单的操作。

而创建订单后，订单的数据是完整的，那么就可以使用 OrderDomain 来处理后续的状态变更操作。
****

##### 2.2 通过领域服务提供服务

领域服务是无状态的，它是一些操作的集合。因为总是有一些操作，不属于任何一个领域对象，那就没必要将这些操作放到领域对象中，可以通过领域服务来独立的提供。

[source, java]
```
public class TradeFacade {

    OrderFacade orderFacade;
    InventoryFacade inventoryFacade;
    OrderDomainFactory orderDomainFactory;

    public void createTrade(String params) {
        CreatingOrderDomain creatingOrderDomain = orderDomainFactory.getCreatingOrderDomain(params);
        creatingOrderDomain.create();
        inventoryFacade.adjustInventory(1L, 1, "reduce", "createTrade");
    }
}
```

交易领域的操作，需要调用订单领域和库存领域的操作，那么可以通过领域服务来提供这些操作。而并不需要创造一个交易领域对象。

#### 3. 通过 repository 和 record 来获取和保存领域对象

[source, java]
```
public class OrderRepository {

    DslContext dslContext;

        public List<OrderItem>  getOrderItems(Long orderId) {
        return new ArrayList<>();
    }

    public List<OrderItem>  getOrderItems(Long orderId) {
    return dslContext.selectFrom(ORDER_ITEM)
            .where(ORDER_ITEM.ORDER_ID.eq(orderId))
            .fetch()
            .map(record -> {
                OrderItem orderItem = new OrderItem();
                orderItem.setGoodsId(record.getGoodsId());
                orderItem.setGoodsCount(record.getGoodsCount());
                return orderItem;
            });
    }

    public void updateOrderStatus(Long orderId, Integer expectStatus, Integer newStatus) {
        OrderRecord orderRecord = dslContext.selectFrom(ORDER)
                .where(ORDER.ORDER_ID.eq(orderId))
                .fetchOne();

        if (orderRecord.getStatus() != expectStatus) {
            throw new OrderException("order status is not expected", OrderException.Codes.ORDER_STATUS_NOT_EXPECTED);
        }
        orderRecord.setStatus(newStatus);
        orderRecord.store();

    }

    public Long updateOrderStatus2(Long orderId, Integer expectStatus, Integer newStatus) {
        Integer effectiveRows = dslContext.update(ORDER)
                .set(ORDER.STATUS, newStatus)
                .where(ORDER.ORDER_ID.eq(orderId))
                .and(ORDER.STATUS.eq(expectStatus))
                .execute();
        if (effectiveRows != 1) {
            throw new OrderException("order status is not expected", OrderException.Codes.ORDER_STATUS_NOT_EXPECTED);
        }
        return effectiveRows.longValue();
    }

}
```

由于 query 逻辑的分离，repository 不再负责为特定视图的查询逻辑，而是负责为领域对象的获取组装。

同时，repository 通过 sql 或者 record 的方式来操作数据库，而不是通过 orm 的方式。这样可以更好的控制 sql 的执行，避免一些不必要的查询。
