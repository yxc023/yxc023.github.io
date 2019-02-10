
title=python入门
date=2016-02-09T01:19:32+08:00
type=post
tags=python
status=published
~~~~~~


#### 原创, 转载请注明出处[https://blog.yangxiaochen.com](https://blog.yangxiaochen.com)

本文不讲python语法, 因为语法手册到处都有, 而且也不难, 本文旨在介绍python的生态环境和开发环境搭建.

## 生态

### 包管理工具 pip

* python 3.*版本自带
* python 2.*须另外安装

pip 文档地址[pip文档](https://pip.pypa.io/en/latest/)

### 虚拟环境 Virtualenv

python安装类库为全局安装, 在一台机器上一个用户安装一个类库, 对该机器上所有用户和项目有效. 所以为了解决这个问题, 引入了虚拟环境, 使依赖类库管理编程项目范围.

* python 3.*版本自带
* python 2.*须另外安装

Virtualenv 文档地址[Virtualenv文档](https://virtualenv.pypa.io/en/latest/)