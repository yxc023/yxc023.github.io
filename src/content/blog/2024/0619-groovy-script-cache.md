---
title: 解决使用 groovy shell 导致 metaspace 增长的问题
date: 2024-06-19
description: 解决使用 groovy shell 导致 metaspace 增长的问题
tags:
  - groovy
  - groovyshell
  - 内存泄漏
---
清理代码的时候发现了之前解决的一个问题，当时没有记录，现在记录一下。

.GroovyScriptCachingBuilder.java
```java

public class GroovyScriptCachingBuilder {
    private GroovyShell shell;

    public GroovyScriptCachingBuilder() {
        this(null);
    }

    public GroovyScriptCachingBuilder(GroovyShell shell) {
        this.shell = shell;
    }

    private final Map<String, Script> scripts = new HashMap<>();

    public Script getScript(final String expression) {
        Script script;
        if (scripts.containsKey(expression)) {
            script = scripts.get(expression);
        } else {
            synchronized (scripts) {
                if (scripts.containsKey(expression)) {
                    script = scripts.get(expression);
                } else {
                    script = shell.parse(expression);
                    scripts.put(expression, script);
                }
            }
        }
        return script;
    }
}
```

```java
private static GroovyScriptCachingBuilder groovyScriptCachingBuilder = new GroovyScriptCachingBuilder();

public static Object evalWithCache(Map instData, String conditionName) {

    final Binding binding = new Binding();
    instData.forEach((key, value) -> binding.setProperty(key.toString(), value));
    Script script = groovyScriptCachingBuilder.getScript(conditionName);
    synchronized (script) {
        script.setBinding(binding);
        return script.run();
    }

}
```

在 script 文本有限的情况下，可以有效避免内存持续增长。

执行效率也有提升：对于一个表达式 `a > 5000`，传入不同的参数 a 执行 10000 次，有缓存耗时 10ms，无缓存耗时 46000ms

这是因为 GroovyShell.parse 方法会生成一个新的 Class，而且这个 Class 会一直存在于 Metaspace 中，导致 Metaspace 不断增长。

我们的解法是将 GroovyShell.parse 生成的 Script 缓存起来，下次再用到相同的表达式时，直接从缓存中取出 Script 执行。
