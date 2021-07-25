<script>
    import { Router, Link, Route } from "svelte-routing";
	import about from "../pages/about.svelte";
	import contact from "../pages/contact.svelte";
	import blog from "../pages/blog.svelte";
    import home from "../pages/home.svelte";
	export let url = "";
    export let y;
</script>
<style>
    
</style>
<Router url="{url}">
    <header class="sticky-top shadow" style="position: fixed;right: 0;left: 0;"> 
        <nav class="navbar navbar-inverse navbar-toggleable-md ">
            <div class="container">
               <div style="width: 75%">
                 <Link to="/" style="float:left">
                     <img src="1.png" class="brand-icon navbar-brand" alt="">
                 </Link>
                 <div class="brand-text" style="width: 300px;float:left" >
                    <span class="brand-icon-custome" style="color: #F7A63C;">Inno</span><span class="brand-icon-custome" style="color: #27a7f9;">linX</span>
                  </div>
               </div>
               
               <button class="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarsExampleCenteredNav" aria-controls="navbarsExampleCenteredNav" aria-expanded="false" aria-label="Toggle navigation">
               <span class="navbar-toggler-icon"></span>
               </button>    
               <div class="collapse navbar-collapse navbar-collapse justify-content-md-end" id="navbarsExampleCenteredNav">
                  <ul class="navbar-nav" style="direction: rtl;">
                     <li class="nav-item">
                         <Link class="nav-link li-item-color" to="/"><i class="fas fa-home text-light" ></i>&nbsp;&nbsp;خانه</Link>
                     </li>
                     <li class="nav-item ">
                         <Link class="nav-link li-item-color" to="blog">بلاگ خبر</Link>
                     </li>
                     <li class="nav-item">
                         <Link class="nav-link li-item-color" to="contact">تماس با ما</Link>
                     </li>
                     <li class="nav-item">
                         <Link class="nav-link li-item-color" to="about">درباره ما</Link>
                     </li>
                  </ul>
               </div>
            </div>
         </nav>
    </header>
    <div>
        <Route path="contact" component="{contact}" />
        <Route path="about" component="{about}" />
        <Route path="blog" component="{blog}" />
        <Route path="/" component="{home}"/>
    </div>
    </Router>