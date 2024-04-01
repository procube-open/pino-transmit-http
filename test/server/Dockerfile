FROM nginx:1.25

RUN apt update && apt install -y supervisor

# supervisord
CMD ["supervisord", "--nodaemon"]
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# avoid message: testing "/etc/nginx/html" existence failed (2: No such file or directory) while logging request
# https://serverfault.com/questions/808560/what-does-existence-failed-20-not-a-directory-while-logging-request-error-l
RUN mkdir /etc/nginx/html

# nginx
COPY nginx.conf /etc/supervisor/conf.d/

# fluentd
RUN apt install -y sudo make gcc && \
    curl -fsSL https://toolbelt.treasuredata.com/sh/install-debian-bookworm-fluent-package5-lts.sh | sh && \
    curl -L https://www.mongodb.org/static/pgp/server-7.0.asc -o /etc/apt/trusted.gpg.d/server-7.0.asc  && \
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list && \
    apt update && apt install -y mongodb-mongosh
ENV GEM_HOME /opt/fluent/lib/ruby/gems/3.2.0/
ENV PATH="/opt/fluent/bin:${PATH}"
RUN /opt/fluent/lib/ruby/gems/3.2.0/bin/fluent-gem install fluent-plugin-mongo
COPY 70-fluentd.conf.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/70-fluentd.conf.sh

# Return 400 default
COPY default.conf /etc/nginx/conf.d/
