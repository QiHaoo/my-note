---
title: docker-compose 搭建 WordPress
created: 2026-07-15
updated: 2026-07-15
status: learning
tags:
  - Docker
  - docker-compose
  - WordPress
  - 容器编排
reviewable: true
module: extras
---

← 参见 主笔记：docker-compose：单机环境下的容器编排工具

用 docker-compose 搭建 WordPress 网站，深入感受容器编排的好处。架构图和第 7 讲一样，分三步定义三个“service”。

## 第一步：MariaDB

数据库 MariaDB，环境变量的写法与 Kubernetes 的 ConfigMap 有点类似，但使用的字段是 `environment`，直接定义，不用再“绕一下”：

```yaml
services:
  mariadb:
    image: mariadb:10
    container_name: mariadb
    restart: always
    environment:
      MARIADB_DATABASE: db
      MARIADB_USER: wp
      MARIADB_PASSWORD: 123
      MARIADB_ROOT_PASSWORD: 123
```

对比第 7 讲里启动 MariaDB 的 Docker 命令，可以发现 docker-compose 的 YAML 和命令行非常像，几乎可以直接照搬：

```bash
docker run -d --rm \
  --env MARIADB_DATABASE=db \
  --env MARIADB_USER=wp \
  --env MARIADB_PASSWORD=123 \
  --env MARIADB_ROOT_PASSWORD=123 \
  mariadb:10
```

## 第二步：WordPress

WordPress 网站也使用 `environment` 设置环境变量：

```yaml
services:
  ...
  wordpress:
    image: wordpress:5
    container_name: wordpress
    restart: always
    environment:
      WORDPRESS_DB_HOST: mariadb  # 注意这里，数据库的网络标识
      WORDPRESS_DB_USER: wp
      WORDPRESS_DB_PASSWORD: 123
      WORDPRESS_DB_NAME: db
    depends_on:
    - mariadb
```

要点：

- 因 docker-compose 会自动把 MariaDB 的名字用作网络标识，连接数据库时（字段 `WORDPRESS_DB_HOST`）不需手动指定 IP 地址，直接用“service”的名字 `mariadb` 就行。这是 docker-compose 比 Docker 命令方便的一个地方，和 Kubernetes 的域名机制很像。
- 字段 `depends_on` 用来设置容器的依赖关系，指定容器启动的先后顺序，编排由多个容器组成的应用时是非常便利的特性。

## 第三步：Nginx 反向代理

很可惜，docker-compose 里没有 ConfigMap、Secret 这样的概念，要加载配置还是必须用外部文件，无法集成进 YAML。Nginx 配置文件和第 7 讲里差不多，`proxy_pass` 指令里不需要写 IP 地址，直接用 WordPress 的名字就行：

```nginx
server {
    listen 80;
    default_type text/html;
    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_pass http://wordpress;  # 注意这里，网站的网络标识
    }
}
```

在 YAML 里定义 Nginx，加载配置文件用的是 `volumes` 字段（和 Kubernetes 一样，但里面的语法又是 Docker 的形式）：

```yaml
services:
  ...
  nginx:
    image: nginx:alpine
    container_name: nginx
    hostname: nginx
    restart: always
    ports:
    - 80:80
    volumes:
    - ./wp.conf:/etc/nginx/conf.d/default.conf
    depends_on:
    - wordpress
```

## 启动与验证

三个“service”都定义好后，用 `docker-compose up -d` 启动网站，记得还是要用 `-f` 参数指定 YAML 文件：

```bash
docker-compose -f wp-compose.yml up -d
```

启动之后，用 `docker-compose ps` 查看状态。也可以用 `docker-compose exec` 进入容器内部验证几个容器的网络标识是否工作正常：

```bash
docker-compose -f wp-compose.yml exec -it nginx sh
```

在容器内分别 ping `mariadb` 和 `wordpress` 两个服务，网络都通，不过它的 IP 地址段用的是 `172.20.0.0/16`，和 Docker 默认的 `172.17.0.0/16` 不一样。再打开浏览器，输入本机的 `127.0.0.1` 或虚拟机的 IP 地址（如 `http://192.168.10.208`），就又可以看到熟悉的 WordPress 界面了。
