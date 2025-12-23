#!/usr/bin/env sh

export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)
./gradlew bake -x gitPublishReset