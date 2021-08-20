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
    export let x;
    export let h;
    $: console.log(h);
    export let currentLocation = window.location.href;
    export let splitUrl = currentLocation.split("/");
    export let lastSugment = splitUrl[splitUrl.length - 1];
    //$ : console.log(lastSugment);
    export let src;
    if(lastSugment==="show-detail"){
        src="../image/1.png";
    }
    else{
        src="image/1.png";
    }
</script>
<style>
    
</style>
<svelte:window bind:scrollY={y} bind:innerWidth={x} bind:innerHeight={h}/>
<Router url="{url}">

    <header class="sticky-top " class:nav-custome-bottom={y<=768}> 
        <nav class="container-fluid pb-0 "  >
            <div class="row justify-content-end " >
                <div class="col-7 col-sm-7 col-custom  px-0">
                    <div class="row ">
                        <div class="col-12">
                            
                            <div class="menu-main-element row justify-content-start mt-1" style="direction: rtl;text-align: center;">
                                <div class="col-2 ">
                                    <Link to="/" class="menu-item-link-color">
                                        <div style="height: 25px;" class="col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0">
                                            <i class="nav-logo fas fa-home  p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br>خانه</span> </i>
                                        </div>
                                    </Link>
                                </div>
                                <div class="col-2">
                                    <Link to="profile" class="menu-item-link-color">
                                        <div style="height: 25px;" class="col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0">
                                            <i class="nav-logo fas fa-mail-bulk p-0 m-0 mt-2 mt-md-0 " ><span class="menu-item d-none d-md-inline"><br>پروفایل فرد</span> </i>
                                        </div>
                                    </Link>
                                </div>
                                
                                <div class="col-2  ">
                                    <Link class="menu-item-link-color" to="show-detail">
                                        <div style="height: 25px;" class="col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0">
                                            <i class="nav-logo fas fa-info-circle ml-1 p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br>جزيیات</span></i>
                                        </div>
                                    </Link>
                                </div>
                                
                                <div class="col-2  ">
                                    <Link class="menu-item-link-color" to="magezine">
                                        <div style="height: 25px;" class="col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0">
                                            <i class="nav-logo fas fa-feather ml-1 p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br>مجله</span></i>
                                        </div>
                                    </Link>
                                </div>
                                <div class="col-2 " data-toggle="modal" data-target="#mod1">
                                    <div class="menu-item-link-color">
                                        <div style="height: 25px;" class="col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0 dropdown">
                                            <i class="nav-logo fas fa-toolbox ml-1 p-0 m-0 mt-2 mt-md-0" ><span class="menu-item d-none d-md-inline"><br><i class="fas fa-sort-down"></i>&nbsp;ابزار</span></i>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-2">
                                    <div class="menu-item-link-color ">
                                        <div data-toggle="dropdown" style="height: 25px;" class="navbar col-12 mt-0 text-center px-0 menu-icon pb-0 mb-0 dropdown">
                                            <img class="ml-1 p-0 m-0 margin-logo logo-cu-nav" src="image/1.jpeg" alt="">
                                            <span class="menu-item-logo d-none d-md-inline "><i class="fas fa-sort-down "></i>&nbsp;من</span>
                                        </div>
                                        <div class="dropdown-menu logo-tab-menu {h<600 ? 'menu-logo-dropdown-tab' : ''}">
                                            <div class="row px-2">
                                                <div class="col-12">
                                                    <div class="row">
                                                        <div class="col-12">
                                                            <div class="row">
                                                                <div class="col-3 pb-3 pl-0 w-auto">
                                                                    <img src="image/1.jpeg" class="mx-0 logo-cu-nav-tab" alt="">
                                                                </div>
                                                                <div class="col-8 direction pr-1">
                                                                    <h6 class="text-bold mb-0 pb-1">
                                                                        مسعودآقایی ساداتی
                                                                    </h6>
                                                                    <p class="pt-0 text-right direction font font-size-custom">
                                                                        مدیر مسیول سایت اینولینکس و مدیرعامل شرکت آفرینه مدرس کارافرینی و MBA
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-12">
                                                            <button class="col-12 w-100 btn btn-sm btn-white border-primary border-custom-view-profile rounded-pill rounded-circle font text-center">ناحیه کاربری</button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <hr class="dropdown-divider">
                                                <div class="col-12 direction text-right font ">
                                                    <h6 class="text-bold mb-0 pb-1">
                                                         حساب کاربری
                                                    </h6>
                                                    <span class="d-block pb-1">
                                                        <!-- svelte-ignore a11y-invalid-attribute -->
                                                        <a href="#" class="text-decoration-none font-tab-nav-account">کمک</a>
                                                    </span>
                                                    <span class="d-block pb-1">
                                                        <!-- svelte-ignore a11y-invalid-attribute -->
                                                        <a href="#" class="text-decoration-none font-tab-nav-account">تنظیمات و شخصی سازی</a>
                                                    </span>
                                                </div>
                                                <hr class="dropdown-divider">
                                                <div class="col-12 direction text-right font ">
                                                    <h6 class="text-bold mb-0 pb-1">
                                                         مدیریت
                                                    </h6>
                                                    <span class="d-block pb-1">
                                                        <!-- svelte-ignore a11y-invalid-attribute -->
                                                        <a href="#" class="text-decoration-none font-tab-nav-account">مقالات و پست ها</a>
                                                    </span>
                                                    
                                                </div>
                                                <hr class="dropdown-divider">
                                                <div class="col-12 direction text-right font ">
                                                    <span class="d-block pb-1">
                                                        <!-- svelte-ignore a11y-invalid-attribute -->
                                                        <a href="#" class="text-decoration-none font-tab-nav-account">خروج</a>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-2 col-md-1 col-lg-2 col-xl-1 ml-1 ml-md-3 ml-lg-5 ">
                    <Link class="row direction text-decoration-none justify-content-between" to="/">
                        <div class="col-1 h-100 ">
                            <img {src} class="brand-icon mt-2" alt="">
                        </div>
                        <div class="col-8 pr-2 direction d-none d-lg-inline">
                            <div class="brand-text">
                                <span class="brand-icon-custome px-3" >اینولینکس</span>
                            </div>
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
        <Route path="show-detail" component="{showDetail}"/>
    </div>
    </Router>
    <div class="nav-modal modal left fade" id="mod1" tabindex="" role="dialog" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-body">
                    <div class="nav flex-sm-column flex-row text-center">
                        حاجی خالیه چیزی نیست
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">بستن</button>
                </div>
            </div>
        </div>
    </div>