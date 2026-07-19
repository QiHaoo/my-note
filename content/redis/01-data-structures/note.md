---
title: Redis 数据结构
created: 2026-07-15
updated: 2026-07-19
status: learning
tags: [redis, cache, data-structure]
reviewable: true
module: basics
---

Redis 支持多种数据结构，每种结构都有其特定的使用场景与底层编码。理解它们的差异，是高效使用 Redis 的前提。

## String

String 是 Redis 最基础的数据类型，底层使用 **SDS（简单动态字符串）** 实现，而非 C 语言的普通字符串。

| 特性 | C 字符串 | SDS |
|------|----------|-----|
| 获取长度 | O(n) 遍历 | O(1) 直接读取 len 字段 |
| 缓冲区溢出 | 可能溢出 | 自动扩容，杜绝溢出 |
| 二进制安全 | 不支持 `\0` | 支持，可存图片/序列化数据 |
| 内存分配 | 每次修改都分配 | 预分配 + 惰性释放 |

常用命令：

```bash
SET name "redis"          # 设置键值
GET name                  # 获取值
INCR counter              # 原子自增
SETEX session:token 60 "abc"   # 60 秒后自动过期
```

<div class="callout callout-info">
String 的应用场景非常广：缓存对象、计数器、分布式锁、限流器等。底层 SDS 的细节详见本章节分笔记。
</div>

## Hash

Hash 适合存储对象，例如用户信息，每个字段可以独立读写。

```bash
HSET user:1 name "Tom" age 28
HGET user:1 name          # "Tom"
HINCRBY user:1 age 1      # 年龄 +1
```

| 编码方式 | 触发条件 | 特点 |
|----------|----------|------|
| ziplist | 元素少且值短 | 内存紧凑，省空间 |
| hashtable | 元素多或值长 | O(1) 读写，内存占用高 |

## List

List 是双向链表，适合实现队列和栈。

- `LPUSH` / `RPUSH`：左/右插入
- `LPOP` / `RPOP`：左/右弹出
- `LRANGE key 0 -1`：查看全部

> List 的底层在 Redis 3.2 后统一为 quicklist（ziplist 组成的链表），兼顾内存与性能。

## Set

Set 是无序、去重的字符串集合，支持交集、并集等集合运算。

```bash
SADD tags "java" "redis" "docker"
SINTER tags:article1 tags:article2   # 两个文章的共同标签
```

## 数据结构选型对比

| 数据结构 | 典型场景 | 底层编码 |
|----------|----------|----------|
| String | 缓存、计数器、锁 | int / embstr / raw |
| Hash | 对象存储 | ziplist / hashtable |
| List | 消息队列、最新列表 | quicklist |
| Set | 标签、共同好友 | intset / hashtable |
| Sorted Set | 排行榜、延迟队列 | ziplist / skiplist |

<div class="callout callout-warning">
选择数据结构时，优先考虑访问模式而非单纯的数据形态。例如存对象既可以用 String + JSON，也可以用 Hash，前者简单但不支持字段级读写。
</div>

## 与其他章节关联

-> 下一讲：Redis 持久化机制
