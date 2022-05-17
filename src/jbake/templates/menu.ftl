
        
   

        <nav class="navbar navbar-expand-lg navbar-light bg-light">
          <div class="container">
            <a class="navbar-brand" href="#">Michael的文档</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNavDropdown">
              <ul class="navbar-nav">
                <li class="nav-item"><a class="nav-link" href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>index.html">首页</a></li> 
                <#--  <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>posts.html">文章</a></li>  -->
                <li class="nav-item"><a class="nav-link" href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>page/design-practices.html">设计实践</a></li>
                <li class="nav-item"><a class="nav-link" href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>page/projects.html">项目</a></li>
                <li class="nav-item"><a class="nav-link" href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>page/principles.html">原则</a></li>
                <#--  <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>post_index.html">blog</a></li>  -->
                <#--  <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>wiki_gradle_index.html">gradle</a></li>  -->
                <#--  <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>tags/git.html">git</a></li>  -->
                <#--  <li><a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>tags/spring.html">spring</a></li>  -->
                <li class="nav-item"><a class="nav-link" href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>${config.archive_file}">Archive</a></li>

                <#--  <li><a href="https://github.com/yxc023/jbake">my jbake</a></li>  -->

                <li class="nav-item"><a class="nav-link" href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>page/about.html">About</a></li>
              </ul>
            </div>
          </div>
        </nav>


    <div class="container">