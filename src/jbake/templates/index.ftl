<#include "header.ftl">
	
	<#include "menu.ftl">

	<#list posts as post>
  		<#if (post.status == "published")>
  			<a href="${post.uri}"><h1><#escape x as x?xml>${post.title}</#escape></h1></a>
  			<p>${post.date?string("yyyy-MM-dd")}
				<span> tags: </span>
				<#list post.tags as tag>
				<span>
					<a href="<#if (content.rootpath)??>${content.rootpath}<#else></#if>tags/${tag}.html">${tag}</a>
				</span>
				</#list>  
			</p>
  		</#if>
  	</#list>

<#include "footer.ftl">