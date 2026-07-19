---
title: WordPress 网站搭建步骤
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, wordpress, configmap, pod]
reviewable: true
module: kubernetes-core
---

← 参见 主笔记：实战演练：玩转Kubernetes（1）

在 Kubernetes 集群里搭建 WordPress 网站，共 4 步。MariaDB、WordPress 被封装成 Pod，环境变量改写成 ConfigMap 统一管理。

## 第一步：编排 MariaDB

MariaDB 需要 4 个环境变量（数据库名、用户名、密码等）。Docker 里用命令行参数 `--env`，Kubernetes 里用 ConfigMap。

先定义 ConfigMap `maria-cm`，再定义 Pod `maria-pod`，用 `envFrom` 把配置信息注入 Pod。完整的对象定义（ConfigMap + Pod，用 `---` 分隔可合并为一个文件创建）：

-> 详见 WordPress 网站对象定义 示例

### envFrom 字段

ConfigMap 里信息较多，用 `env.valueFrom` 逐个写很麻烦、易出错；`envFrom` 可一次性把 ConfigMap 的全部字段导入 Pod，并能指定变量名前缀（这里是 `MARIADB_`），非常方便。

### 创建与查看

```bash
kubectl apply -f mariadb-pod.yml
kubectl get pod -o wide
```

数据库成功跑起来后，IP 地址是 `172.17.0.2`（注意这是 Kubernetes 私有网段，与 Docker 不同）。

## 第二步：编排 WordPress

同样先用 ConfigMap `wp-cm` 定义环境变量，再编写 Pod `wp-pod`，同样使用 `envFrom`。

`wp-cm` 中的 `HOST` 字段必须是 MariaDB Pod 的 IP 地址，写错则 WordPress 无法连接数据库。完整对象定义见示例文件。

-> 详见 WordPress 网站对象定义 示例

```bash
kubectl apply -f wp-pod.yml
kubectl get pod -o wide
```

## 第三步：端口映射

Pod 运行在 Kubernetes 内部私有网段，外界无法直接访问。对外暴露服务需用专门的 `kubectl port-forward` 命令，它把本机端口映射到目标对象的端口，类似 Docker 的 `-p`，常用于临时调试和测试。

把本地 8080 映射到 WordPress Pod 的 80：

```bash
kubectl port-forward wp-pod 8080:80 &
```

命令末尾的 `&` 让端口转发在后台进行，不阻碍后续操作。关闭转发时敲 `fg` 把后台任务带回前台，再用 `Ctrl + C` 停止；也可用 `jobs -l` 查看后台任务、用 `kill` 结束进程。

> `kubectl port-forward` 只能用于测试，生产环境要用 Ingress，不能用于 CI/CD，应改成 Service 的方式。映射的端口只能本机访问，外界访问还需借助 Nginx 反向代理。

## 第四步：Nginx 反向代理

WordPress 网站使用 URL 重定向，直接用 8080 会导致跳转故障，所以要在 Kubernetes 之外启动 Nginx 反向代理，保证外界看到的仍是 80 端口。

Nginx 配置文件与第 7 讲基本一样，只是目标地址变成 `127.0.0.1:8080`（第三步 port-forward 创建的本地地址）：

```nginx
server {
    listen 80;
    default_type text/html;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_pass http://127.0.0.1:8080;
    }
}
```

用 `docker run -v` 加载该配置文件，以容器方式启动 Nginx 代理：

```bash
docker run -d --rm \
    --net=host \
    -v /tmp/proxy.conf:/etc/nginx/conf.d/default.conf \
    nginx:alpine
```

之后打开浏览器访问本机 `127.0.0.1` 或虚拟机 IP，即可看到 WordPress 界面。也可用 `kubectl logs` 查看 WordPress、MariaDB 等 Pod 的运行日志验证请求响应。

> `--net=host` 让 docker 用本机网络，不是 bridge 端口映射；该模式仅支持 Linux。

## 关于 IP 与 Service

- Pod 重启后 IP 会变化，本讲手工填写 IP 只是从 Docker 到 Kubernetes 的过渡阶段，中级篇会用 Service 对象解决
- Kubernetes 集群内部的 IP 地址外部不可见；同一集群节点内，Pod 之间可通过 Kubernetes 分配的私有网段 IP 互相访问，这是 Kubernetes 的基本网络模型
- 一般做法是一个应用一个 Pod，方便独立部署、管理、扩容；MariaDB 与 WordPress 是两个不同领域的应用，不应强制绑定在一个 Pod 里
