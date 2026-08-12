---
title: 如何让系统中的权限更好用？RBAC之外的三个关键实践
date: 2025-12-30
description: 分享三个在RBAC基础上的扩展实践，帮助企业级系统构建更灵活、更可维护的权限体系
tags:
  - 权限
  - RBAC
  - 系统设计
  - 架构
---
在企业管理系统建设中，权限控制是绕不开的话题。大多数团队会采用 RBAC（基于角色的访问控制）模型：用户拥有角色，角色拥有权限，权限控制访问。

这套模型很经典，但在实际落地时常常遇到这样的困境：

- "为什么这个角色的人能看到全部数据，那个人只能看一部分？"
- "新增一种访问限制，是不是要新建一个角色？"
- "子级资源的权限怎么配？给每个人都配一遍吗？"

[NOTE]
> 举个例子：假设你做一个商户管理系统，系统中的资源包括：**门店、订单、发货单、退款单**（门店是主实体）。
> 
> 涉及三类角色，各自的访问需求如下：
> 
> **运营线角色**：负责城市运营管理
> 
> * 运营经理负责一个城市，能查看该城市内所有门店——这需要按"城市"约束
> 
> **维护线角色**：负责门店日常维护
> 
> * 维护经理与某些门店绑定，能查看这些门店的信息及关联数据
> * 维护总监能查看他下属所有维护经理负责的门店
> * 访问订单等子资源时，需要通过门店来验证权限
> 
> **商户侧角色**：商户自己的人
> 
> * 商户或店长应该能查看自己名下的门店

本文分享三个在 RBAC 基础上的扩展实践，帮助企业级系统构建更灵活、更可维护的权限体系。

---

## 实践一：权限点即规范——定义决定实现

### 核心思想

很多人把权限点理解为"菜单开关"或"按钮控制"，这其实是一种误解。

**权限点定义的不仅是"能不能访问"某个资源，更重要的是"用什么样的规则"去访问这个资源。** 权限点是访问规则的结构化声明，程序代码必须严格按照权限点的定义来执行。

不同的权限点类型，对应着不同的程序实现模式。这是一份"契约"，一旦定义，开发就必须按契约实现。

### 三种常见模式

| 权限点类型 | 访问规则定义 | 程序如何实现 |
| --- | --- | --- |
| 无约束读 |  |  |
| 可访问所有数据 |  |  |
| 直接返回全部数据 |  |  |
| 约束型读 |  |  |
| 可访问范围由外部约束配置决定（如按城市、按部门） |  |  |
| 获取约束范围，动态过滤 |  |  |

### 案例：商户管理系统的权限点设计

以商户管理系统为例，不同角色需要不同的商户访问范围：

**场景 A：运营按城市查看门店**

- 权限点：`store:read*by*city`
- 定义：只能访问指定城市的门店
- 实现：先从约束系统获取用户可访问的城市列表，再过滤数据

**场景 B：维护经理只看自己维护的门店**

- 权限点：`store:read*by*maintainer`
- 定义：只能访问自己关联维护的门店
- 实现：先从约束系统获取用户可访问的门店列表，再过滤数据

**场景 C：商户/店长只看自己的门店**

- 权限点：`store:read*by*owner`
- 定义：只能访问自己是所有人或店长的门店
- 实现：
```java
`return storeRepository.findByOwnerIdOrManagerId(currentUserId)`
```

固定过滤

.权限点判断与查询逻辑示例
```java
public List<Store> queryStores(User user) {
    if (permissionService.hasPermission(user, "store:read_by_maintainer")) {
        // 按维护人过滤：从约束系统获取用户维护的门店ID列表
        List<String> allowedStoreIds = constraintService.getStoreIds(user);
        return allowedStoreIds.isEmpty()
            ? Collections.emptyList()
            : storeRepository.findByIdIn(allowedStoreIds);
    }

    if (permissionService.hasPermission(user, "store:read_by_owner")) {
        // 按所有人过滤：返回用户拥有的门店
        Long currentUserId = UserContext.getCurrentUserId();
        return storeRepository.findByOwnerIdOrManagerId(currentUserId);
    }

    if (permissionService.hasPermission(user, "store:read_by_city")) {
        // 按城市约束：从约束系统获取城市列表，然后过滤
        List<String> allowedCities = constraintService.getCities(user);
        return allowedCities.isEmpty()
            ? storeRepository.findAll()
            : storeRepository.findByCityIn(allowedCities);
    }

    throw new AccessDeniedException("无门店访问权限");
}
```

**关键要点**：权限点和代码实现是一一对应的，权限点的定义也决定了代码的规则。

---

## 实践二：约束系统独立领域化

### 核心思想

回顾实践一，我们为门店的不同访问规则定义了不同的权限点：

- `store:read*by*city`
- `store:read*by*maintainer`
- `store:read*by*owner`

**但这里有一个问题**：如果系统中有订单、发货单、退款单等其他资源，它们也都需要按城市、按门店来控制访问，难道要为每个资源都创建一套类似的权限点吗？

| 资源 | 需要的权限点 |
| --- | --- |
| 门店 |  |
| `store:read_by_city`, `store:read_by_maintainer`, `store:read_by_owner` |  |
| 订单 |  |
| `order:read_by_city`, `order:read_by_store`, `order:read_by_creator` |  |
| 发货单 |  |
| `shipment:read_by_city`, `shipment:read_by_store`, `shipment:read_by_creator` |  |
| ... |  |
| ... |  |

**约束规则其实是统一的**：按城市、按门店、按创建人。只是每个资源都在重复定义这些规则。

**另一种思路**：使用统一的权限点（如 `store:read`），权限点定义中声明支持哪些约束类型（city、store），然后从约束系统动态获取该人员的具体约束值。

当访问规则需要灵活配置时，**将约束逻辑独立成专门的领域服务**，与权限系统解耦。

| 设计方式 | 权限点 | 约束来源 | 适用场景 |
| --- | --- | --- | --- |
| 方式一（实践一） |  |  |  |
| 按规则命名（`store:read_by_city`） |  |  |  |
| 规则隐含在权限点名称中 |  |  |  |
| 访问规则固定，无需灵活配置 |  |  |  |
| 方式二（本实践） |  |  |  |
| 统一命名（`store:read`） |  |  |  |
| 先从元数据获取权限点的约束类型，再从约束系统获取该人员的约束值 |  |  |  |
| 访问规则需要灵活配置 |  |  |  |

权限系统负责"能不能做"，约束系统负责"能做哪些"。两者协作，各司其职。

### 案例：门店访问的两种设计方式

以门店管理系统为例，看看两种设计方式的区别。

#### 方式二：统一权限点 + 约束系统（本实践的做法）

.统一权限点，约束从约束系统获取
```java
@GetMapping("/store")
@RequiresPermission("store:read")
public List<Store> listStores() {
    User user = UserContext.getCurrentUser();

    // 1. 从权限点元数据获取该权限点支持的约束类型（如 city, store）
    PermissionMetadata metadata = permissionService.getPermissionMetadata("store:read");
    List<String> constraintTypes = metadata.getConstraintTypes(); // ["city", "store"]

    // 2. 根据约束类型，从约束系统获取该用户的具体约束值
    List<String> storeIds = null;
    List<String> cities = null;

    for (String constraintType : constraintTypes) {
        List<String> values = constraintService.getConstraintValues(user, constraintType);
        if ("city".equals(constraintType)) {
            cities = values;
        } else if ("store".equals(constraintType)) {
            storeIds = values;
        }
    }

    // 3. 按约束条件组合查询
    return storeRepository.findByConstraints(storeIds, cities);
}
```

**优势**：新增约束维度时，只需要在权限点元数据中配置新的约束类型，不需要新建权限点，代码也不需要修改。

**劣势**：需要维护大量的权限约束信息（用户与约束值的映射关系），当约束规则复杂时，约束系统的维护成本会较高。

**如何选择两种设计方式**：

| 场景特征 | 推荐方式 | 原因 |
| --- | --- | --- |
| 访问规则固定、种类少 |  |  |
| 方式一：权限点隐含规则 |  |  |
| 代码逻辑清晰，不需要额外的约束系统 |  |  |
| 访问规则需要灵活配置、种类多 |  |  |
| 方式二：统一权限点 + 约束系统 |  |  |
| 避免权限点爆炸，配置更灵活 |  |  |

**两种方式可以结合使用**：

- 对于固定规则（如商户/店长看自己的门店），使用方式一
- 对于灵活规则（如运营按城市、维护经理按门店），使用方式二

---

## 实践三：主次要实体原则

### 核心思想

当系统中存在大量实体时，如果为每个实体都配置一遍人员权限或者约束，维护成本会高到不可接受。

**解决方案：只维护主实体的人员关系，子实体通过主实体间接验证权限。**

### 模型示意

```
┌──────┐    维护人关系   ┌──────┐
│主实体│ ◀───────────── │ 人   │
│(门店)│                 └──────┘
└──────┘
      │ 拥有
      ├────┬────┐
      ▼    ▼    ▼
┌────────┐ ┌────────┐ ┌────────┐
│子实体A │ │子实体B │ │子实体C │
│(订单)  │ │(发货)  │ │(退款)  │
└────────┘ └────────┘ └────────┘
```

### 脱敏案例：商户管理系统的子资源访问

在商户管理系统中，一个门店（主实体）下有订单、发货单、退款单等子实体。

**如果每个子实体都单独配权限**：

- 订单要配订单负责人
- 发货单要配发货负责人
- 退款单要配退款负责人
- ...（无穷无尽）

**按主次要实体原则**：

- 只配置门店的维护经理（通过约束系统）
- 子实体访问时，通过门店间接验证权限

.子实体访问时支持传入主实体标识
```java
@GetMapping("/order")
@RequiresPermission("order:read")
public Order getOrder(
    @RequestParam Long orderId,
    @RequestParam String storeNo  // 必传主实体标识
) {
    User currentUser = UserContext.getCurrentUser();

    // 校验用户是否有权限访问该门店
    boolean hasAccess = constraintService.hasAccessToStore(currentUser, storeNo);
    if (!hasAccess) {
        throw new AccessDeniedException("无权限访问该门店");
    }

    // 有权限，返回订单
    return orderService.getById(orderId);
}
```

**实施要点**：

1. 子实体 URL 支持传入主实体标识参数
2. 从约束系统获取用户对该主实体的权限，而不是直接查询实体的 maintainerId 字段
3. 避免通过子实体反查主实体（性能差）

---

## 总结

回到开头的问题：如何让系统中的权限更好用？

| 实践 | 解决的核心问题 | 关键动作 |
| --- | --- | --- |
| 权限点即规范 |  |  |
| 权限和代码脱节 |  |  |
| 明确权限点的访问规则定义，代码严格按定义实现 |  |  |
| 约束独立领域化 |  |  |
| 访问范围难以灵活配置 |  |  |
| 将约束系统独立出来，与权限系统协作 |  |  |
| 主次要实体原则 |  |  |
| 实体多时维护成本高 |  |  |
| 只维护主实体关系，子实体通过主实体验证 |  |  |

这三者并非孤立，而是互相配合：

- **权限点定义了需要什么样的约束**（如"按城市访问"）
- **约束系统提供了获取约束值的能力**（如获取用户可访问的城市列表）
- **主次要实体原则**则帮助你在复杂业务场景下简化配置

**最终的目标**是构建一个既灵活又可控、既能满足复杂业务需求又易于维护的权限体系。这比单纯讨论"用什么权限模型"更有实际意义。
