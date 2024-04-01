#!/bin/bash
# vim:sw=4:ts=4:et

set -e
ME=$(basename "$0")

entrypoint_log() {
    if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
        echo "$@"
    fi
}

entrypoint_log "$ME: info: register fluentd to supervisord."

cat > /etc/supervisor/conf.d/fluentd.conf << 'EOF'
[program:fluentd]
environment=LD_PRELOAD=/opt/fluent/lib/libjemalloc.so,GEM_HOME=/opt/fluent/lib/ruby/gems/3.2.0/,GEM_PATH=/opt/fluent/lib/ruby/gems/3.2.0/,FLUENT_CONF=/etc/fluent/fluentd.conf,FLUENT_PLUGIN=/etc/fluent/plugin,FLUENT_SOCKET=/var/run/fluent/fluentd.sock
command=/opt/fluent/bin/fluentd
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
autorestart=true
user=nginx
EOF

mkdir -p /var/log/fluent
chown nginx:nginx /var/log/fluent

mkdir -p /etc/fluent/conf.d

entrypoint_log "$ME: info: put fluentd configuration for http."
cat > /etc/fluent/conf.d/auditlogs.conf << __EOF
<source>
  @type http
  port 9880
  bind 0.0.0.0
  body_size_limit 32m
  keepalive_timeout 30s
</source>
__EOF

entrypoint_log "$ME: info: put fluentd configuration for mongodb."

cat > /etc/fluent/fluentd.conf << __EOF
@include /etc/fluent/conf.d/*.conf

# Single MongoDB
<match operations>
  @type mongo
  host ${LOGDB_HOST}
  port 27017
  database fluentd
  collection operation

  # for capped collection
  capped
  capped_size 1024m

  # authentication
  user ${LOGDB_USER}
  password ${LOGDB_PASSWORD}

  <buffer>
    # flush
    flush_interval 10s
  </buffer>
</match>
__EOF

mongosh "mongodb://${LOGDB_HOST}" -u "${LOGDB_ROOT_USER}" -p "${LOGDB_ROOT_PASSWORD}" << __EOF
use fluentd;
if (db.getUser("${LOGDB_USER}") == null) {  
  db.createUser(
    {
      user: "${LOGDB_USER}",
      pwd: "${LOGDB_PASSWORD}",
      roles: [ "readWrite" ]
    }
  );
}
__EOF
