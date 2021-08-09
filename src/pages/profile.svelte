<script>
    import {onMount} from "svelte";
    import "../App.svelte";
    import {fade , slide , scale , fly} from "svelte/transition";
    import { Loader } from "@googlemaps/js-api-loader"
    import { Router, Link, Route } from "svelte-routing";
    import {circIn} from "svelte/easing";
    import showDetail from "./show-detail.svelte";
    export let url = "";
    export let y;
    export let x;
    $: console.log(x);
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.has('id');
    console.log(id);
    let isOpen = false;
    let current = 'post';
    function toggleNav(){
        isOpen =! isOpen;       
    }
    //let y=0;
    var currentLocation = window.location.href;
    var splitUrl = currentLocation.split("/");
    var lastSugment = splitUrl[splitUrl.length - 1];
    // $ : console.log(lastSugment);
    let map;
</script>
<style>
    @import "public/global.css";
    
</style>
<svelte:window bind:scrollY={y} bind:innerWidth={x}/>
<svelte:head>
    <title>
        اینولینکس
    </title>
</svelte:head>
<Router url="{url}">

{#if y>600}
<section class="row nav-mag-scroll pr-0 mr-0 bg-light mt-0 d-none d-md-inline" > 
    
    <div transition:slide class="col-12 scroll-div bg-light pr-0 mr-5 nav-custome-top">
        <div class="row justify-content-between shadow-sm mr-0">
            <div class="col-8 col-md-4 direction my-auto" >
                <div class="row justify-content-end">
                    <button class="btn rounded-pill font btn-mw-scroll text-center visit-btn mx-0 "><i class="fas fa-external-link-alt padding-button ml-2 icon-size-scroll"></i>بازدید سایت </button>

                    <div class="col-5 mr-0 justify-content-start dropdown dropleft px-2">
                        <button  type="button" data-toggle="dropdown" class="pt-0 pl-md-5 pr-md-3 px-lg-3 btn btn-sm btn-mw-scroll rounded-pill col-12 font text-center col-md-7">بیشتر</button>
                        
                        <ul class="dropdown-menu  ellipsis-menu">
                            <li><a href="#"><i class="fas fa-share-alt"></i> اشتراک صفحه </a></li>
                            <li><a href="#"><i class="fas fa-flag"></i> گزارش دادن</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-6  col-md-5 bg-light py-2  direction " >
                <div class="row mr-3 ">
                    <div class="col-1 mr-3  my-auto">
                        <img src="image/afarine.jpg" class="logo-cu-scroll" alt="">
                    </div>
                    <div class="col-10">
                        <h5 class="text-logo-scroll mt-2 mr-2">آفرینه&nbsp;<i style="color:#048af7;font-size: 13px;" class="fas fa-check-circle"></i></h5>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-12 mt-0 scroll-main-height">
            <div class="row  mx-4 scroll-main-height">
                <ul class="nav nav-tabs direction text-center" role="tablist">
                    <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='post'} on:click="{() => current = 'post'}" data-toggle="tab" href="#post">پست</a></li>
                    <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='about'} on:click="{() => current = 'about'}"  data-toggle="tab" href="#about">درباره</a></li>
                </ul>
            </div>
        </div>
    </div>
    
</section>
{/if}



<main transition:scale class="container-fluid pin-parent px-0 px-md-3">
    <div class="row justify-content-center mx-0">
        
        <aside class="col-12 col-md-3 mr-2 d-none d-lg-inline" >
            <div class="row">
                <div class="col-12 shadow-radius-section bg-light">
                    <div class="row ">
                        <div class="col-12 my-1">
                            <a href="#">
                                <img class="w-100 dream-job-image" src="image/job.jpg" alt="">
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
        <aside class="col-12 col-lg-8  ">
            <div class="row ml-md-1 ">
                <div class="col-12 ">
                    <div class="row p-0 shadow-radius-section bg-white" >
                        <div class="col-12 p-0 banner" style="overflow: hidden;">
                            <img class=" header-image bg-light" src="image/head.jpeg" alt="">
                        </div>
                        <div class="col-12 header-image-main">
                            <img class="header-logo-image" src="image/afarine.jpg" alt="">
                        </div>
                        <div class="header-detail col-12">
                            <div class="row">
                                <div class="col-10">
                                    <h3 class="text-bold">آفرینه&nbsp;<i style="color:#048af7;font-size: 20px;" class="fas fa-check-circle"></i></h3>
                                    <h6 class="text-secondary"><i class="fas fa-map-marker-alt"></i>&nbsp;تهران,شهرک طالقانی,ساحتمان نگین</h6>
                                    <h6 class="explain-about-page">به آفرینه محلق شوید و بروز باشید .می توانید مطالب مرتبط به کارآفرینی و بازاریابی رو از اینجا دنبال کنید اگر از محتوای ما خوشتان اومد آنرا  با دیگران به اشتراک بگذارید.</h6>
                                    <div class="col-12 mt-4 font">
                                        <div class="row">
                                            <button class="btn  rounded-pill  font btn-mw text-center visit-btn mx-1  "><i class="fas fa-external-link-alt padding-button ml-2 icon-size"></i>بازدید سایت </button>
                                            <div class="col-5 justify-content-start dropdown dropleft pr-1">
                                                <button type="button" data-toggle="dropdown" class="pt-custome-more-btn btn btn-mw rounded-pill col-12 font text-center col-md-6 ">بیشتر</button>
                                                <ul class="dropdown-menu  ellipsis-menu">
                                                    <li><a href="#"><i class="fas fa-share-alt"></i> اشتراک صفحه </a></li>
                                                    <li><a href="#"><i class="fas fa-flag"></i> گزارش دادن</a></li>
                                                </ul>
                                            </div>
                                            
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                            <div class="col-12 tab-header-main mt-3 ">
                                <div class="row  scroll-main-height">
                                    <ul class="nav nav-tabs direction text-center" role="tablist">
                                        <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='post'}  on:click="{() => current = 'post'}" data-toggle="tab" href="#post">پست</a></li>
                                        <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='about'}  on:click="{() => current = 'about'}"  data-toggle="tab" href="#about">درباره</a></li>
                                    </ul>
                                </div>
                            </div>
                            
                    </div>
                </div>
            </div>
            <div class="tab-content w-100 mr-0">
                <div id="post" class="row tab-pane" class:active="{current==='post'}">
                    <div class="row px-0 mx-0" >
                        <aside class="col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ">
                            <section class="row mx-0 mt-3 mr-0 pt-0  ">
                                <div class="col-12 p-0 main-article ">
                                    <article class="p-0  shadow-radius-section shadow-section mb-4 bg-light">
                                        <div class="col-12">
                                            <div class="row justify-content-between p-2 pl-4 pl-md-2">
                                                <div class="col-11 col-md-11" >
                                                    <div class="row ">
                                                        <div class="col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1" >
                                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center ">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="#" class="title-post-link">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="col-1 ml-0 pl-0 pr-4  pr-md-3 pr-lg-4 dropdown">
                                                    <i class="fas fa-ellipsis-h -1 " type="button" data-toggle="dropdown"></i>
                                                    <ul class="dropdown-menu ellipsis-menu">
                                                        <li><!-- <i class="fas fa-bookmark"></i> --> <a  class="dropdown-item" href="#"><i class="far fa-bookmark"></i> ذخیره کردن پست</a> </li>
                                                        <li><a class="dropdown-item" href="#"><i class="fas fa-share-alt"></i> کپی کردن لینک </a></li>
                                                        <li><a class="dropdown-item" href="#"><i class="fas fa-flag"></i> گزارش دادن</a></li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="col-12 p-0">
                                            <h3  class="title-post mt-1 mb-0 py-3 pr-3"><a class="title-post-link" href="profile/show-detail">به اینولینکس خوش آمدید</a></h3>
                                        </div>
                                        <div class="col-12 p-0 mx-0 responsive-imagePost-height">
                                            <img src="image/30.jpg" class="p-0 mr-0 w-100 responsive-imagePost-height" alt="">
                                        </div>
                                        
                                        <p class="col-12 mt-3 post-text">
                                            طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                             صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                             برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید <span id="dots">...</span><span id="more"> طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                            برای پر کردن صفحه و ارایه اولیه شکل 
                                            ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                            صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.</span>
                                            <!-- svelte-ignore missing-declaration -->
                                            <span on:click={myFunction} id="myBtn" style="cursor: pointer;">بیشتر بخوانید</span>
                                            
                                        </p>
                                        <div class="col-12 ">
                                            <a href="#">
                                                <button id="read-more" class="btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10">ادامه مطلب</button>
                                            </a>
                                        </div>
                                        
                                        <div class="col-12 mb-1 author-show-box pt-1">
                                            <a class="a-clicked" href="#">
                                                <img class="personal-img" src="image/1.jpeg" alt="">
                                                <span class="personal-name"> مسعودآقایی ساداتی</span>&nbsp;&nbsp;
                                            </a>
                                            <div class="view-count"><i class="fas fa-eye"></i> ۵۶</div>
                                        </div>
                                    </article>
                                    <article class="p-0 shadow-radius-section shadow-section mb-3 bg-light">
                                        <div class="col-12">
                                            <div class="row justify-content-between p-2">
                                                <div class="col-11 col-md-11" >
                                                    <div class="row ">
                                                        <div class="col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1" >
                                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="#">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۸ روز قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="col-1 ml-0 pl-0 pr-4 dropdown">
                                                <i class="fas fa-ellipsis-v " type="button" data-toggle="dropdown"></i>
                                                <ul class="dropdown-menu ellipsis-menu">
                                                    <li><!-- <i class="fas fa-bookmark"></i> --> <a href="#"><i class="far fa-bookmark"></i> ذخیره کردن پست</a> </li>
                                                    <li><a href="#"><i class="fas fa-share-alt"></i> کپی کردن لینک </a></li>
                                                    <li><a href="#"><i class="fas fa-flag"></i> گزارش دادن</a></li>
                                                </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-12 p-0">
                                            <h3  class="title-post mt-1 mb-0 py-3 pr-3"><a href="#">نگاهی اجمالی به آخرین دستاوردهای شبکه اجتماعی فیس بوک</a> </h3>
                                        </div>
                                        <div class="col-12 p-0 mx-0 responsive-imagePost-height">
                                            <img src="image/28.jpg" class="p-0 mr-0 w-100 responsive-imagePost-height" alt="">
                                        </div>
                                        
                                        <p class="col-12 mt-3 post-text">
                                            طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                             صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                             برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید <span id="dots">...</span><span id="more"> طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                            برای پر کردن صفحه و ارایه اولیه شکل 
                                            ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                            صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.</span>
                                            <!-- svelte-ignore missing-declaration -->
                                            <span on:click={myFunction} id="myBtn" style="cursor: pointer;">بیشتر بخوانید</span>
                                            
                                        </p>
                                        <div class="col-12 ">
                                            <a href="#">
                                                <button id="read-more" class="btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10">ادامه مطلب</button>
                                            </a>
                                        </div>
                                        <hr class="col-11 mx-auto">
                                        <div class="col-12 mb-3">
                                            <a class="a-clicked" href="#">
                                                <img class="personal-img" src="image/1.jpeg" alt="">
                                                <span class="personal-name"> مسعودآقایی ساداتی</span>&nbsp;&nbsp;
                                            </a>
                                            <div class="view-count"><i class="fas fa-eye"></i> ۱۴۲</div>
                                        </div>
                                    </article>
                                    <article class="p-0 shadow-radius-section shadow-section mb-3 bg-light">
                                        <div class="col-12">
                                            <div class="row justify-content-between p-2">
                                                <div class="col-11 col-md-11" >
                                                    <div class="row ">
                                                        <div class="col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1" >
                                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="#">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="col-1 ml-0 pl-0 pr-4 dropdown">
                                                <i class="fas fa-ellipsis-v " type="button" data-toggle="dropdown"></i>
                                                <ul class="dropdown-menu ellipsis-menu">
                                                    <li><!-- <i class="fas fa-bookmark"></i> --> <a href="#"><i class="far fa-bookmark"></i> ذخیره کردن پست</a> </li>
                                                    <li><a href="#"><i class="fas fa-share-alt"></i> کپی کردن لینک </a></li>
                                                    <li><a href="#"><i class="fas fa-flag"></i> گزارش دادن</a></li>
                                                </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-12 p-0">
                                            <h3  class="title-post mt-1 mb-0 py-3 pr-3"><a href="#">راه های مدیریت کسب و کار الکترونیکی</a></h3>
                                        </div>
                                        <div class="col-12 p-0 mx-0 responsive-imagePost-height">
                                            <img src="../image/20.jpg" class="p-0 mr-0 w-100 responsive-imagePost-height" alt="">
                                        </div>
                                        
                                        <p class="col-12 mt-3 post-text">
                                            طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                             صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                             برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید <span id="dots">...</span><span id="more"> طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                            برای پر کردن صفحه و ارایه اولیه شکل 
                                            ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                            صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.</span>
                                            <!-- svelte-ignore missing-declaration -->
                                            <span on:click={myFunction} id="myBtn" style="cursor: pointer;">بیشتر بخوانید</span>
                                            
                                        </p>
                                        <div class="col-12 ">
                                            <a href="#">
                                                <button id="read-more" class="btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10">ادامه مطلب</button>
                                            </a>
                                        </div>
                                        <hr class="col-11 mx-auto">
                                        <div class="col-12 mb-3">
                                            <a class="a-clicked" href="#">
                                                <img class="personal-img" src="image/4.jpeg" alt="">
                                                <span class="personal-name"> مجتبی اکبری</span>&nbsp;&nbsp;
                                            </a>
                                            <div class="view-count"><i class="fas fa-eye"></i> ۱۲</div>
                                        </div>
                                    </article>
                                    
                                    
                                </div>
                            </section>
                        </aside>
                        <aside  class=" col-12 col-md-3 mt-3 ">
                            <div class="row px-0 text-center shadow-radius-section bg-light " class:d-none={x<=767}>
                                <div class="col-10 mx-auto mt-5 mb-3 ">
                                    <img class="company-img  w-100" src="image/afarine.jpg" alt="">
                                </div>
                                <h3 class="col-12">
                                    آفرینه
                                </h3>
                                <h6 class="col-12">
                                    زندگی به سبک نوآوری
                                </h6>
                            </div>
                            <div class="{x >=767 ? 'row direction shadow-radius-section mt-4 py-2 bg-white': 'row direction '}" >
                                <div class="{x >=767 ? 'col-12 font-weight-bold pb-2 border-bottom pr-0': 'col-12 font-weight-bold'}">
                                    <a type="{x<=767 ? 'button' : ''}" class="btn " data-toggle="{x<=767 ? 'modal' :''}"   data-target="{x<=767 ? '#myModal2' : ''}">
                                        <i class="fas fa-list-ul category-icon-modal" class:category-fixed-icon-modal={x<=767 && y>=400}></i>
                                    </a><span class="d-none d-md-inline">دسته بندی </span>
                                </div>
                                <div class="{x<=767 ? 'modal right' : ''} mt-2 mr-1 col-12 p-0 d-lg-inline" id="{x<=767 ? 'myModal2' : ''}" tabindex="{x<=767 ? '-1' : ''}" role="{x<=767 ? 'dialog' : ''}" aria-hidden="true">
                                    <div id="accordion" class="{x<=767 ? 'modal-dialog modal-content pr-2' : ''}" role="{x<=767 ? 'document' : ''}">
                                        {#if x<=767}
                                            <button type="button" class="close row mx-2 justify-content-end" 
                                            data-dismiss="modal" 
                                            aria-label="Close">
                    
                                                <span class="col-1 mt-1" aria-hidden="true">
                                                ×</span>
                                            </button>
                                        {/if}
                                        <div class="mb-2 pl-2 ">
                                          <div class="border-bottom pb-2" id="headingOne">
                                            <h5 class="mb-0">
                                              <a class="p-0 d-inline category_button collapsed " data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne"></a>
                                              <a href="#" class="category-main-text-link">
                                                <p class="category-main-text d-inline">بازاریابی</p>
                                              </a>
                                            </h5>
                                          </div>
                                          <div id="collapseOne" class="collapse mr-3 " aria-labelledby="headingOne" data-parent="#accordion">
                                            <div class="border-right">
                                                <div class=" mt-2 mr-1 col-12 p-0 ">
                                                    <div id="accordion1">
                                                        <div class="mb-2 pl-2">
                                                          <div class="border-bottom pb-2" id="headingOneOne">
                                                            <h5 class="mb-0">
                                                              <a class="p-0 d-inline category_button collapsed " data-toggle="collapse" data-target="#collapseOneOne" aria-expanded="true" aria-controls="collapseOneOne"></a>
                                                              <a href="#" class="category-main-text-link">
                                                                <p class="category-main-text d-inline">کسب و کار</p>
                                                              </a>
                                                            </h5>
                                                          </div>
                                                          <div id="collapseOneOne" class="collapse mr-3 " aria-labelledby="headingOneOne" data-parent="#accordion1">
                                                            <div class="">
                                                              فوتبال 
                                                            </div>
                                                          </div>
                                                        </div>
                                                        <div class="mb-2 pl-2">
                                                          <div class="border-bottom pb-2" id="headingTwoTwo">
                                                            <h5 class="mb-0">
                                                              <a href="#" class="p-0 d-inline category_button collapsed" data-toggle="collapse" data-target="#collapseTwoTwo" aria-expanded="false" aria-controls="collapseTwoTwo"></a>
                                                              <a href="#" class="category-main-text-link">
                                                                <p class="category-main-text d-inline">مدیریت تلکنولوژی</p>
                                                              </a>
                                                            </h5>
                                                          </div>
                                                          <div id="collapseTwoTwo" class="collapse mr-3" aria-labelledby="headingTwoTwo" data-parent="#accordion1">
                                                            <div class="">
                                                              خاورمیانه
                                                            </div>
                                                          </div>
                                                        </div>
                                                        <div class="mb-2 pl-2">
                                                          <div class="border-bottom pb-2" id="headingThreeThree">
                                                            <h5 class="mb-0">
                                                              <a href="#" class="p-0 d-inline category_button collapsed" data-toggle="collapse" data-target="#collapseThreeThree" aria-expanded="false" aria-controls="collapseThreeThree"></a>
                                                              <a href="#" class="category-main-text-link">
                                                                <p class="category-main-text d-inline">آرشیو کلیپ ها</p>
                                                              </a>
                                                            </h5>
                                                          </div>
                                                          <div id="collapseThreeThree" class="collapse mr-3" aria-labelledby="headingThreeThree" data-parent="#accordion1">
                                                            <div class="border-right">
                                                                <div class=" mt-2 mr-1 col-12 p-0 ">
                                                                    <div id="accordion2">
                                                                        <div class="mb-2 pl-2">
                                                                          <div class="border-bottom pb-2" id="headingOneOneOne">
                                                                            <h5 class="mb-0">
                                                                              <a class="p-0 d-inline category_button collapsed " data-toggle="collapse" data-target="#collapseOneOneOne" aria-expanded="true" aria-controls="collapseOneOneOne"></a>
                                                                              <a href="#" class="category-main-text-link">
                                                                                <p class="category-main-text d-inline">کسب و کار</p>
                                                                              </a>
                                                                            </h5>
                                                                          </div>
                                                                          <div id="collapseOneOneOne" class="collapse mr-3 " aria-labelledby="headingOneOneOne" data-parent="#accordion2">
                                                                            <div class="">
                                                                              فوتبال 
                                                                            </div>
                                                                          </div>
                                                                        </div>
                                                                        <div class="mb-2 pl-2">
                                                                          <div class="border-bottom pb-2" id="headingTwoTwoTwo">
                                                                            <h5 class="mb-0">
                                                                              <a href="#" class="category-main-text-link">
                                                                                <p class="category-main-text d-inline">مدیریت تلکنولوژی</p>
                                                                              </a>
                                                                            </h5>
                                                                          </div>
                                                                          <div id="collapseTwoTwoTwo" class="collapse mr-3" aria-labelledby="headingTwoTwoTwo" data-parent="#accordion2">
                                                                            <div class="">
                                                                              خاورمیانه
                                                                            </div>
                                                                          </div>
                                                                        </div>
                                                                      </div>
                                                                </div> 
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                </div> 
                                            </div>
                                          </div>
                                        </div>
                                        <div class="mb-2 pl-2">
                                          <div class="border-bottom pb-2" id="headingTwo">
                                            <h5 class="mb-0">
                                              <a href="#" class="p-0 d-inline category_button collapsed" data-toggle="collapse" data-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo"></a>
                                              <a href="#" class="category-main-text-link">
                                                <p class="category-main-text d-inline">مدیریت تلکنولوژی</p>
                                              </a>
                                            </h5>
                                          </div>
                                          <div id="collapseTwo" class="collapse mr-3" aria-labelledby="headingTwo" data-parent="#accordion">
                                            <div class="">
                                              خاورمیانه
                                            </div>
                                          </div>
                                        </div>
                                        <div class="mb-2 pl-2">
                                          <div class="border-bottom pb-2" id="headingThree">
                                            <h5 class="mb-0">
                                              <a href="#" class="p-0 d-inline category_button collapsed" data-toggle="collapse" data-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree"></a>
                                              <a href="#" class="category-main-text-link">
                                                <p class="category-main-text d-inline">آرشیو کلیپ ها</p>
                                              </a>
                                            </h5>
                                          </div>
                                          <div id="collapseThree" class="collapse mr-3" aria-labelledby="headingThree" data-parent="#accordion">
                                            <div class="">
                                              راهیان نور
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
                <div id="about" class="row tab-pane mt-3 margin-about-right" class:active="{current==='about'}">
                    <div class="col-12 direction ">
                        <div class="row bg-white shadow-radius-section ml-1 py-4 px-1">
                            <div class="col-12 ">
                                <h5 class="text-bold mb-2">درباره آفرینه</h5>
                                <p class="text-secondary text-justify word-space">
                                    لورم ایپسوم یک متن ساختگی برای طراحی و نمایش محتوای بی ربط است اما این متن نوشته شده هیچ ربطی به لورم ایپسوم ندارد.
                                    این چیزی که میبینید صرفا یک متن ساختگی تر نسبت به لورم ایپسوم است تا شما بتواندی با گرفتن خروجی در سایت و موبایل یا هر دستگاه دیگر خروجی بگیرید و نگاه کنید که ساختار کد نوشتاری سایت با لورم به چه صورتی در آمده است.
                                    با تشکر از سایت ساختگی نوشتار لورم ایپسوم آقای بوق 
                                </p>
                                <div class="col-12">
                                    <div class="row ">
                                        <div class="col-4 text-bold pr-0">وبسایت</div>
                                        <div class="col-8 text-bold pr-0 mb-4">
                                            <a class="text-primary" href="#">
                                                http://afarine.com/
                                            </a>
                                        </div>
                                        <div class="col-4 text-bold pr-0">نوع فعالیت</div>
                                        <div class="col-8 pr-0 mb-4 text-secondary">
                                            کارآفرینی و کسب و کار - خصوصی
                                        </div>
                                        <div class="col-4 text-bold pr-0">میزان استخدام</div>
                                        <div class="col-8 pr-0 mb-4 text-secondary">
                                            ۱۲۰ + کارمند
                                        </div>
                                        <div class="col-4 text-bold pr-0">تاریخ تاسیس</div>
                                        <div class="col-8 pr-0 mb-4 text-secondary">
                                            ۲۰۱۸
                                        </div>
                                        <div class="col-4 text-bold pr-0">تخصص ها</div>
                                        <div class="col-8 pr-0 mb-4 text-secondary">
                                           اشتغال/بازاریابی/کسب و کار/
                                        </div>
                                        <div class="col-4 text-bold pr-0">آدرس اصلی</div>
                                        <div class="col-8 pr-0 mb-4 text-secondary">
                                            تهران,شهرک طالقانی,ساحتمان نگین
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="row bg-white shadow-radius-section ml-1 py-4 px-1 mt-3">
                            <div class="col-12 ">
                                <h5 class="text-bold ">موقعیت مکانی آفرینه</h5>
                                <p class="text-secondary text-justify word-space">
                                    برای یافتن مکان دقیق باید زوم کنید
                                </p>
                                <div class="row">
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
        </aside>
    </div>
    
</main>
<br><br>

</Router>
