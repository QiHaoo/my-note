---
title: Redis 数据结构
created: 2026-07-15
updated: 2026-07-15
status: learning
tags: [redis, cache, data-structure]
reviewable: true
---

Redis 支持多种数据结构，每种结构都有其特定的使用场景。

## String

String 是 Redis 最基础的数据类型，底层使用 SDS（简单动态字符串）实现。

- 二进制安全
- O(1) 获取长度
- 避免缓冲区溢出

## Hash

Hash 适合存储对象，例如用户信息。

## List

List 是双向链表，适合实现队列和栈。
