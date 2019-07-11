<#include "header.ftl">

	<#include "menu.ftl">
	
	<div class="page-header">
		<h1><#escape x as x?xml>${content.title}</#escape></h1>
	</div>

	<p>${content.body}</p>

	<hr />


	<div id="gitalk-container"></div>
	<script>
		const gitalk = new Gitalk({
		clientID: '9fda08d9f8fbe4a76212',
		clientSecret: '9a91a6260819f30af5d9c4534815493865d409a7',
		repo: 'yxc023.github.io',
		owner: 'yxc023',
		admin: ['yxc023'],
		id: "${content.sid!content.title}",      // Ensure uniqueness and length less than 50
		distractionFreeMode: false  // Facebook-like distraction free mode
		})

		gitalk.render('gitalk-container')

	</script>

	<#--  <div id="cyReward" role="cylabs" data-use="reward"></div>  -->
	<!--PC版-->
	<#--  <div id="SOHUCS" sid="${content.title}"></div>  -->
	<#--  <script charset="utf-8" type="text/javascript" src="https://changyan.sohu.com/upload/changyan.js" ></script>
	<script type="text/javascript">
	window.changyan.api.config({
	appid: 'cysiPXECq',
	conf: 'prod_ae8c2fcf65d92ee749cc9cf448e5b285'
	});
	</script>  -->

	<#--  <script type="text/javascript" charset="utf-8" src="https://changyan.itc.cn/js/lib/jquery.js"></script>
	<script type="text/javascript" charset="utf-8" src="https://changyan.sohu.com/js/changyan.labs.https.js?appid=cysiPXECq"></script>  -->
<#include "footer.ftl">