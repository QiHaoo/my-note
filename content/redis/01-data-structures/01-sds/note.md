---
title: SDS 简单动态字符串
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [redis, sds]
reviewable: true
---

SDS（Simple Dynamic String）是 Redis 对 C 字符串的改良实现，几乎所有需要字符串的场景都用它。

## 为什么不用 C 字符串

C 字符串（`char[]`）有几个致命缺陷：

1. 获取长度需 O(n) 遍历到 `\0`
2. 修改时可能缓冲区溢出
3. 不支持二进制安全（`\0` 会被截断）
4. 频繁修改导致频繁内存分配

## SDS 的结构

SDS 在字符串头部记录了长度信息：

```c
struct sdshdr {
    int len;      // 已使用长度
    int alloc;    // 分配的总长度
    char flags;   // 类型标记
    char buf[];   // 实际数据
};
```

## 空间预分配策略

当 SDS 需要扩容时，Redis 会额外分配空间，减少后续内存重分配：

| 修改后长度 | 分配策略 |
|------------|----------|
| < 1MB | 分配同样大小的额外空间（即 alloc = 2 × len） |
| >= 1MB | 固定多分配 1MB |

> 这种策略使得连续增长操作的平均时间复杂度从 O(n) 降到了 O(1)。

## 惰性空间释放

缩短字符串时，SDS 不立即释放多余空间，而是记录为 `free` 字段，供后续使用。真正内存紧张时才回收。

<div class="callout callout-info">
SDS 仍以 `\0` 结尾，是为了能直接复用 `<string.h>` 里的函数（如 `printf("%s", sds)`），避免重复造轮子。
</div>

## 三种编码方式

Redis 3.2 后 SDS 按长度分了 5 种子类型，用不同的整数类型存 len/alloc 以节省头部空间：

| 类型 | 字段类型 | 最大长度 |
|------|----------|----------|
| sdshdr5 | uint8_t | 32 字节 |
| sdshdr8 | uint8_t | 256 字节 |
| sdshdr16 | uint16_t | 64KB |
| sdshdr32 | uint32_t | 4GB |
| sdshdr64 | uint64_t | 2^64 |
