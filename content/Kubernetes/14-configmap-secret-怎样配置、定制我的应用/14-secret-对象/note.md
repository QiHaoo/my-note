---
title: Secret 对象
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, secret]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：ConfigMap-Secret：怎样配置、定制我的应用

Secret 和 ConfigMap 的结构和用法很类似，不过 Kubernetes 里 Secret 对象细分出很多类。

## Secret 的分类

| 类别 | 用途 |
|------|------|
| 访问私有镜像仓库的认证信息 | 镜像仓库认证 |
| 身份识别的凭证信息 | 身份凭证 |
| HTTPS 通信的证书和私钥 | 通信加密 |
| 一般的机密信息（格式由用户自行解释） | 通用机密 |

课程只使用最后一种，创建 YAML 样板的命令是 `kubectl create secret generic`，同样要使用 `--from-literal` 参数给出 Key-Value 值：

```bash
kubectl create secret generic user --from-literal=name=root $out
```

## 基本结构与 Base64 编码

Secret 第一眼感觉和 ConfigMap 非常相似，只是 kind 字段由 ConfigMap 变成 Secret，后面同样是 data 字段，里面也是 Key-Value 数据。

不同之处在于：Secret 不直接保存明文，需要对数据做 Base64 编码，是一串"乱码"，不让用户直接看到原始数据，起一定的保密作用。不过手法非常简单，只是 Base64 编码，算不上真正的加密。

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: user

data:
  name: cm9vdA==       # root
  pwd: MTIzNDU2        # 123456
  db: bXlzcWw=         # mysql
```

可以绕开 kubectl 自己用 Linux 小工具 base64 对数据编码后写入 YAML：

```bash
echo -n "123456" | base64
# MTIzNDU2
```

注意 echo 必须要加 `-n` 去掉字符串里隐含的换行符，否则 Base64 编码出来的字符串是错误的。

## 创建与查看

```bash
kubectl apply -f secret.yml
kubectl get secret
kubectl describe secret user
```

因为是保密的，`kubectl describe` 不能直接看到内容，只能看到数据的大小，可与 ConfigMap 对比。

> Base64 只是一种编码方式，不是加密，Kubernetes 里可以配置成对 Secret 加密。Secret 保存在 etcd 中内容是未经过加密的，对 Secret 资源的权限要做好控制，可通过 RBAC 规则限制或使用其他加密方式。
