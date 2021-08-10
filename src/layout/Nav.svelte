<script>
    import { Router, Link, Route } from "svelte-routing";
    import {fade , slide , scale , fly} from "svelte/transition";
	import about from "../pages/about.svelte";
	import contact from "../pages/contact.svelte";
    import magezine from "../pages/magezine.svelte";
	import profile from "../pages/profile.svelte";
    import showDetail from "../pages/show-detail.svelte";
    import home from "../pages/home.svelte";
	export let url = "";
    export let y;
    var currentLocation = window.location.href;
    var splitUrl = currentLocation.split("/");
    var lastSugment = splitUrl[splitUrl.length - 1];
    $ : console.log(lastSugment);
    let src;
    if(lastSugment==="show-detail"){
        src="../image/1.png";
    }
    else{
        src="image/1.png";
    }
</script>
<style>
    
</style>

<Router url="{url}">

    <header class="sticky-top " class:nav-custome-bottom={y<=600}> 
        <nav class="container-fluid pb-0 "  >
            <div class="row justify-content-end " >
                <div class="col-9">
                    <div class="row ">
                        <div class="col-12">
                            
                            <div class="row justify-content-start"  style="direction: rtl;">
                                <div class="col-2 col-md-1">
                                    <Link to="/" class="menu-item-link-color">
                                        <div style="height: 25px;" class="col-12 mt-2 px-auto menu-icon pb-0 mb-0">
                                            <i class="fas fa-home ml-1 p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br>خانه</span> </i>
                                        </div>
                                    </Link>
                                </div>
                                <div class="col-2 col-md-1 ">
                                    <Link class="menu-item-link-color" to="contact">
                                        <div style="height: 25px;" class="col-12 mt-2 px-auto menu-icon ">
                                            <i class="fas fa-mail-bulk ml-1 p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br>تماس باما</span></i>
                                        </div>
                                    </Link>
                                </div>
                                <div class="col-2 col-md-1 ">
                                    <Link class="menu-item-link-color" to="about">
                                        <div style="height: 25px;" class="col-12 mt-2 px-auto menu-icon pb-0 mb-0">
                                            <i class="fas fa-info-circle ml-1 p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br>درباره ما</span></i>
                                        </div>
                                    </Link>
                                </div>
                                
                                <div class="col-2 col-md-1 ">
                                    <Link class="menu-item-link-color" to="magezine">
                                        <div style="height: 25px;" class="col-12 mt-2 px-auto menu-icon pb-0 mb-0">
                                            <i class="fas fa-feather ml-1 p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br>آفرینه</span></i>
                                        </div>
                                    </Link>
                                </div>
                                <div class="col-2 col-md-1" data-toggle="modal" data-target="#exampleModal">
                                    <div class="menu-item-link-color">
                                        <div style="height: 25px;" class="col-12 mt-2 px-auto menu-icon pb-0 mb-0 dropdown">
                                            <i class="fas fa-toolbox ml-1 p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br><i class="fas fa-sort-down"></i>&nbsp;ابزار</span></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-3 col-md-2 pl-4 ">
                    <Link to="/">
                        <div class="col-7 ">
                            <div class="brand-text mx-0">
                                <span class="brand-icon-custome" >اینولینکس</span>
                            </div>
                        </div>
                        <div class="col-1 h-100">
                            <img {src} class="brand-icon" alt="">
                        </div>
                    </Link>
                    
                </div>
            </div>
        </nav>
    </header>
    <div>
        <Route path="contact" component="{contact}" />
        <Route path="about" component="{about}" />
        <Route path="/" component="{home}"/>
        <Route path="profile" component="{profile}"/>
        <Route path="magezine" component="{magezine}"/>
        <Route path="profile/show-detail" component="{showDetail}"/>
        <Route path="magezine/show-detail" component="{showDetail}"/>
    </div>
    </Router>
    <div class="modal left fade" id="exampleModal" tabindex="" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-body">
                    <div class="nav flex-sm-column flex-row text-center">
                        حاجی خالیه چیزی نیست
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>