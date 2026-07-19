---
title: Redis 持久化
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [redis, persistence]
reviewable: true
module: basics
---

Redis 提供了两种持久化方式：RDB 和 AOF。

## RDB

RDB 是快照持久化，在指定时间间隔内将内存中的数据集快照写入磁盘。

- 适合备份和灾难恢复
- 文件紧凑，恢复速度快
- 可能丢失最后一次快照后的数据

## AOF

AOF 是日志持久化，记录服务器接收到的每个写操作。

- 更高的数据安全性
- 文件体积通常比 RDB 大
- 恢复速度相对较慢
