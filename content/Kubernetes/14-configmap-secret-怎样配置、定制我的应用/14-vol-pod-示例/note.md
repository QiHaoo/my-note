---
title: vol-pod 示例
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, configmap, secret, volume, example]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：ConfigMap-Secret：怎样配置、定制我的应用

以 Volume 方式使用 ConfigMap/Secret 的 Pod。在 spec.volumes 定义两个 Volume：cm-vol 引用 ConfigMap 对象 info，sec-vol 引用 Secret 对象 user（secretName）。Volume 属于 Pod 不属于容器，与 containers 同级。然后在 containers.volumeMounts 里把 Volume 挂载到容器路径。镜像 busybox，执行 sleep 睡眠 300 秒。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: vol-pod

spec:
  volumes:
  - name: cm-vol
    configMap:
      name: info
  - name: sec-vol
    secret:
      secretName: user

  containers:
  - volumeMounts:
    - mountPath: /tmp/cm-items
      name: cm-vol
    - mountPath: /tmp/sec-items
      name: sec-vol
    image: busybox
    name: busy
    imagePullPolicy: IfNotPresent
    command: ["/bin/sleep", "300"]
```

创建后用 kubectl exec 进入 Pod 查看配置信息加载形式：

```bash
kubectl apply -f vol-pod.yml
kubectl get pod
kubectl exec -it vol-pod -- sh
```

ConfigMap 和 Secret 都变成目录形式，里面的 Key-Value 变成一个个文件，文件名就是 Key。
