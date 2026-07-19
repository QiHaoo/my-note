---
title: CronJob 的 YAML 描述
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, cronjob, batch]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：Job-CronJob：为什么不直接用Pod来处理业务

学习了"临时任务"的 Job 对象之后，再学习"定时任务"的 CronJob 对象就比较容易了。

## 生成样板

用 `kubectl create` 创建 CronJob 的样板。两点注意：

- 因为 CronJob 的名字有点长，Kubernetes 提供了简写 `cj`（可用 `kubectl api-resources` 看到）
- CronJob 需要定时运行，命令行里需要指定参数 `--schedule`

```bash
export out="--dry-run=client -o yaml"  # 定义 Shell 变量
kubectl create cj echo-cj --image=busybox --schedule="" $out
```

## 三层 spec 嵌套

CronJob 的 spec 字段连续有三个 spec 嵌套层次：

| spec 层次 | 从属于 | 定义 |
|----------|--------|------|
| 第一个 spec | CronJob 自身 | CronJob 自己的对象规格声明 |
| 第二个 spec | jobTemplate | 定义一个 Job 对象 |
| 第三个 spec | template | 定义 Job 里运行的 Pod |

CronJob 其实是又组合了 Job 而生成的新对象，是"套娃"结构：CronJob -> Job -> Pod。

### 控制链示意

- **CronJob** 通过 jobTemplate 组合 **Job**
- **Job** 通过 template 组合 **Pod**
- **Pod** 通过 containers 定义 **容器**
- **容器** 运行 **进程**

即 CronJob -> Job -> Pod -> 容器 -> 进程 的逐层控制关系。

## 关键字段

除了定义 Job 对象的 `jobTemplate` 字段外，CronJob 还有一个 `schedule` 字段，用来定义任务周期运行的规则。

- `schedule`：使用标准 Cron 语法，指定分钟、小时、天、月、周，和 Linux 上的 crontab 一样（5 位）。示例 `'*/1 * * * *'` 表示每分钟运行一次。

-> 详见 echo-cj 示例
