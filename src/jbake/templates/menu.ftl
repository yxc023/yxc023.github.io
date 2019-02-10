	<!-- Fixed navbar -->
    <div class="navbar navbar-default navbar-fixed-top" role="navigation">
      <div class="container">
        <div class="navbar-header">
          <button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <a class="navbar-brand" href="/">Michael的文档</a>
        </div>
        <div class="navbar-collapse collapse">
          <ul class="nav navbar-nav">
             <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>index.html">首页</a></li> 
            <#--  <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>post_index.html">blog</a></li>  -->

            <#--  <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>posts.html">博客</a></li>  -->
            <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>wiki_gradle_index.html">gradle</a></li>
            <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>tags/git.html">git</a></li>
            <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>tags/spring.html">spring</a></li>
            <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>${config.archive_file}">archive</a></li>

            <li><a href="https://github.com/yxc023/jbake">my jbake</a></li>

            <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>about.html">关于</a></li>


             <#--  <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>${config.feed_file}">Subscribe</a></li>  -->
            <#--  <li class="dropdown">
              <a href="#" class="dropdown-toggle" data-toggle="dropdown">Dropdown <b class="caret"></b></a>
              <ul class="dropdown-menu">
                <li><a href="#">Action</a></li>
                <li><a href="#">Another action</a></li>
                <li><a href="#">Something else here</a></li>
                <li class="divider"></li>
                <li class="dropdown-header">Nav header</li>
                <li><a href="#">Separated link</a></li>
                <li><a href="#">One more separated link</a></li>
              </ul>
            </li>   -->
          </ul>
        </div><!--/.nav-collapse -->
      </div>
    </div>
    <div class="container">