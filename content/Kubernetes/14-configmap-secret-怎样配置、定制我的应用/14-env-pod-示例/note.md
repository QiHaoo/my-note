---
title: env-pod 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, configmap, secret, example]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：ConfigMap-Secret：怎样配置、定制我的应用

以环境变量方式使用 ConfigMap/Secret 的 Pod。名字是 env-pod，镜像 busybox，执行 sleep 睡眠 300 秒。env 字段定义了 4 个环境变量：COUNT、GREETING 引用 ConfigMap 对象 info（使用 configMapKeyRef）；USERNAME、PASSWORD 引用 Secret 对象 user（使用 secretKeyRef）。name 是 API 对象的名字，key 是对象里的 Key-Value 名字。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: env-pod

spec:
  containers:
  - env:
    - name: COUNT
      valueFrom:
        configMapKeyRef:
          name: info
          key: count
    - name: GREETING
      valueFrom:
        configMapKeyRef:
          name: info
          key: greeting
    - name: USERNAME
      valueFrom:
        secretKeyRef:
          name: user
          key: name
    - name: PASSWORD
      valueFrom:
        secretKeyRef:
          name: user
          key: pwd
    image: busybox
    name: busy
    imagePullPolicy: IfNotPresent
    command: ["/bin/sleep", "300"]
```

创建 Pod 后用 kubectl exec 进入 Pod 验证环境变量：

```bash
kubectl apply -f env-pod.yml
kubectl exec -it env-pod -- sh
echo $COUNT
echo $GREETING
echo $USERNAME $PASSWORD
```
