---
title: 搭建 WordPress 网站
created: 2026-07-19
updated: 2026-07-19
status: learning
tags: [kubernetes, docker, wordpress, networking]
reviewable: true
module: container-basics
---

← 参见 主笔记：实战演练：玩转Docker

Docker Registry 应用比较简单，只用单个容器运行一个完整服务。WordPress 网站稍复杂，需要用到三个容器：WordPress、MariaDB、Nginx，都是流行开源项目，Docker Hub 上有官方镜像。

## 网络架构

| 容器 | 角色 | 端口 |
|------|------|------|
| MariaDB | 后端关系型数据库 | 3306 |
| WordPress | 中间应用服务器，使用 MariaDB 存储数据 | 80 |
| Nginx | 前面反向代理，对外暴露 80，把请求转发给 WordPress | 80（对外映射） |

网络流向（文字描述）：浏览器访问 127.0.0.1:80 → 请求到达 Nginx 容器（IP 172.17.0.4，反向代理）→ Nginx 通过 proxy_pass 转发到 WordPress 容器（IP 172.17.0.3，应用服务器，80 端口）→ WordPress 读写 MariaDB 容器（IP 172.17.0.2，数据库，3306 端口）。

先拉取镜像：

```bash
docker pull wordpress:5
docker pull mariadb:10
docker pull nginx:alpine
```

## 1. 运行 MariaDB

根据说明文档，需要配置 `MARIADB_DATABASE` 等几个环境变量，用 `--env` 参数指定启动时的数据库、用户名和密码。这里指定数据库是 db，用户名是 wp，密码是 123，管理员密码也是 123。

```bash
docker run -d --rm \
  --env MARIADB_DATABASE=db \
  --env MARIADB_USER=wp \
  --env MARIADB_PASSWORD=123 \
  --env MARIADB_ROOT_PASSWORD=123 \
  mariadb:10
```

启动后可用 `docker exec` 执行数据库客户端工具 mysql 验证是否正常运行：

```bash
docker exec -it 9ac mysql -u wp -p
```

输入用户名 wp 和密码 123 后就连上了 MariaDB，可用 `show databases;`、`show tables;` 等命令查看内容（此时是空的）。

Docker bridge 网络模式默认网段是 172.17.0.0/16，宿主机固定 172.17.0.1，且 IP 顺序分配，所以若之前没有其他容器运行，MariaDB 容器 IP 应该就是 172.17.0.2，用 `docker inspect` 验证：

```bash
docker inspect 9ac | grep IPAddress
```

## 2. 运行 WordPress

WordPress 也要用 `--env` 指定一些环境变量才能连接到 MariaDB，**注意 `WORDPRESS_DB_HOST` 必须是 MariaDB 的 IP 地址，否则无法连接数据库**：

```bash
docker run -d --rm \
  --env WORDPRESS_DB_HOST=172.17.0.2 \
  --env WORDPRESS_DB_USER=wp \
  --env WORDPRESS_DB_PASSWORD=123 \
  --env WORDPRESS_DB_NAME=db \
  wordpress:5
```

WordPress 容器启动时没有使用 `-p` 参数映射端口号，所以外界不能直接访问，需要前面配一个 Nginx 反向代理，把请求转发给 WordPress 的 80 端口。

## 3. 配置并运行 Nginx 反向代理

配置 Nginx 反向代理必须知道 WordPress 的 IP 地址，同样用 `docker inspect` 查看，若没有意外应该是 172.17.0.3。编写配置文件（`proxy_pass` 不写端口默认就是 80）：

```text
server {
    listen 80;
    default_type text/html;
    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_pass http://172.17.0.3;
    }
}
```

关键一步：用 `-p` 把本机端口映射到 Nginx 容器内部的 80 端口，再用 `-v` 把配置文件挂载到 Nginx 的 `conf.d` 目录下。这样 Nginx 就会使用编写好的配置文件，在 80 端口监听 HTTP 请求，再转发到 WordPress 应用：

```bash
docker run -d --rm \
  -p 80:80 \
  -v `pwd`/wp.conf:/etc/nginx/conf.d/default.conf \
  nginx:alpine
```

> `pwd` 是 shell 命令（反引号执行），获取当前目录；wp.conf 必须保证在当前目录下存在。

## 验证

三个容器都启动后，用 `docker ps` 查看状态：WordPress 和 MariaDB 虽使用了 80 和 3306 端口，但被容器隔离、外界不可见，只有 Nginx 有端口映射，能从外界 80 端口收发数据，网络状态与架构描述一致。

打开浏览器，输入本机的 127.0.0.1 或虚拟机 IP 地址即可看到 WordPress 界面。创建基本用户、初始化网站后，可再登录 MariaDB 查看，WordPress 已在数据库里新建了很多表，证明容器化的 WordPress 网站搭建成功。

> 这三个容器都在一个 docker 环境里，每个容器的网络环境是隔离的，但它们的网卡都接在 docker0 网桥上，所以可以互通。

## 用容器名替代 IP

文章中 nginx → wp → db 相互通过容器 IP 地址访问，其实可以不指定 IP、通过容器名访问，有两种方法：

1. **自定义网络**：启动容器时加入自定义的 bridge 网络 `my_network`，原理是容器间互联通过 Docker DNS Server。此时 `WORDPRESS_DB_HOST` 可填容器名 db1，Nginx 的 `proxy_pass` 可填 `http://wp1`
2. **--link**：启动 WordPress 时 `--link db1:db1`，启动 Nginx 时 `--link wp1:wp1`，原理是容器间互联通过容器里的 `/etc/hosts`

> docker 里也可以自定义网络，用起来比 IP 地址方便，但特意没讲，怕和后面的 Kubernetes 混淆。理解了 Kubernetes 的 Service 机制，再回头学 docker 的自定义网络会比较容易。
