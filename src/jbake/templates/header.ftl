<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8"/>
    <title><#if (content.title)??><#escape x as x?xml>${content.title} - </#escape></#if>Michael的博客</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="<#if (content.description)??><#escape x as x?xml>${content.description}</#escape><#elseif (content.title)??><#escape x as x?xml>${content.title}</#escape><#else>Michael的博客</#if>">
    <meta name="author" content="yxc023@qq.com">
    <meta name="keywords" content="<#if (content.tags)??><#list content.tags as tag>${tag},</#list></#if>yangxiaochen">
    <meta name="robots" content="index, follow" />
    <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <meta name="bingbot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
    <#if (content.uri)??>
      <link rel="canonical" href="http://blog.yangxiaochen.com/${content.uri}" />  
    </#if>
    
    <meta name="generator" content="JBake">
    <!--  <script data-ad-client="ca-pub-5626174695342369" async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>  -->

    <!-- Le styles -->
    <link href="//cdn.staticfile.org/bootstrap/5.1.3/css/bootstrap.min.css" rel="stylesheet">
    <#--  <link href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>css/asciidoctor.css" rel="stylesheet">  -->
    <link href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>css/adoc-golo.css" rel="stylesheet">
    <link href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>css/base.css" rel="stylesheet">
    <link href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>css/prettify.css" rel="stylesheet">
    <link rel="stylesheet" href="//cdn.staticfile.org/gitalk/1.0.0/gitalk.min.css">


    <!-- HTML5 shim, for IE6-8 support of HTML5 elements -->
    <!--[if lt IE 9]>
      <script src="<#if (content.rootpath)??>${content.rootpath}<#else></#if>js/html5shiv.min.js"></script>
    <![endif]-->

    <!-- Fav and touch icons -->
    <!--<link rel="apple-touch-icon-precomposed" sizes="144x144" href="../assets/ico/apple-touch-icon-144-precomposed.png">
    <link rel="apple-touch-icon-precomposed" sizes="114x114" href="../assets/ico/apple-touch-icon-114-precomposed.png">
    <link rel="apple-touch-icon-precomposed" sizes="72x72" href="../assets/ico/apple-touch-icon-72-precomposed.png">
    <link rel="apple-touch-icon-precomposed" href="../assets/ico/apple-touch-icon-57-precomposed.png">-->
    <link rel="shortcut icon" href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>favicon.ico">

    <#--  <link rel="stylesheet" href="https://unpkg.com/gitalk/dist/gitalk.css">  -->
	  <#--  <script src="https://unpkg.com/gitalk/dist/gitalk.min.js"></script>  -->
  </head>
  <body onload="prettyPrint()">
    <div id="wrap">
   