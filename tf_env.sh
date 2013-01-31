#!/bin/bash
#
# this script sets the environment for other fascinator scripts
#
# jvm memory settings
JAVA_OPTS="-XX:MaxPermSize=256m -Xmx2048m"
RMTDEBUG_OPTS="-Xdebug -Xrunjdwp:transport=dt_socket,address=4000,server=y,suspend=y"

# use http_proxy if defined
if [ -n "$http_proxy" ]; then
	_TMP=${http_proxy#*//}
	PROXY_HOST=${_TMP%:*}
	_TMP=${http_proxy##*:}
	PROXY_PORT=${_TMP%/}
	echo " * Detected HTTP proxy host:'$PROXY_HOST' port:'$PROXY_PORT'"
	PROXY_OPTS="-Dhttp.proxyHost=$PROXY_HOST -Dhttp.proxyPort=$PROXY_PORT -Dhttp.nonProxyHosts=localhost"
else
	echo " * No HTTP proxy detected"
fi

# set fascinator home directory
if [ -z "$TF_HOME" ]; then
	export TF_HOME=$HOME/.fascinator
fi

# set solr base directory
if [ -z "$SOLR_BASE_DIR" ]; then
	SOLR_BASE_DIR=$TF_HOME
fi
CONFIG_DIRS="-Dfascinator.home=$TF_HOME -Dsolr.base.dir=$SOLR_BASE_DIR"

# set options for maven to use
echo "PROXY_OPTS are $PROXY_OPTS"
echo "JAVA_OPTS are $JAVA_OPTS"
echo "REMOTE DEBUG opts are $RMTDEBUG_OPTS"
export MAVEN_OPTS="$JAVA_OPTS $RMTDEBUG_OPTS $PROXY_OPTS $CONFIG_DIRS"
