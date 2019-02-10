<#include "header.ftl">

	<#include "menu.ftl">
	<p>${content.body}</p>
	<#list wiki_gradles as post>
  		<#if (post.status == "published")>
  			<a href="${post.uri}"><h5><#escape x as x?xml>${post.title}</#escape></h5></a>
  		</#if>
  	</#list>
	

<#include "footer.ftl">