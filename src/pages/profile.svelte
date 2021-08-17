<script>
    import {onMount} from "svelte";
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
                <div class="row justify-content-end vm-navbar">
                    <button class="btn rounded-pill font btn-mw-scroll-profile text-center visit-btn mx-0 "><i class="fas fa-external-link-alt padding-button ml-2 icon-size-scroll"></i>بازدید سایت </button>

                    <div class="col-5 mr-0 justify-content-start navbar dropdown dropleft px-2">
                        <button  type="button" data-toggle="dropdown" class="pt-0 pl-md-3 pr-md-3 mr-2 px-lg-3 btn btn-sm btn-mw-scroll-profile rounded-pill col-12 font text-center col-md-7">بیشتر</button>
                        
                        <ul class="dropdown-menu  ellipsis-menu">
                            <li><a href="#"><i class="fas fa-share-alt"></i> اشتراک صفحه </a></li>
                            <li><a href="#"><i class="fas fa-flag"></i> گزارش دادن</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-6  col-md-8 bg-light py-2  direction " >
                <div class="row mr-3 ">
                    <div class="col-1 mr-3  mt-0">
                        <img src="image/1.jpeg" class="logo-cu-scroll-profile" alt="">
                    </div>
                    <div class="col-10 pr-0">
                        <h5 class="text-logo-scroll-profile mt-0 mr-0">آفرینه&nbsp;<i style="color:#048af7;font-size: 13px;" class="fas fa-check-circle"></i><br><span class="explain-about-page-scroll">مدیر شرکت آفرینه و مسپول سایت اینولینکس .به صفحه من خوش آمدید میتوانید مطالب مرتبط به شرکت آفرینه و کارآفرینی و کسب و کار را در اینجا مشاهده کنید</span></h5>
                    </div>
                </div>
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
                        <div class="col-12 p-0 banner" >
                            <img class=" header-image-person bg-light" src="image/head.jpeg" alt="">
                        </div>
                        <div class="col-12 header-image-main border-radius">
                            <img class="header-logo-image-person border-radius" src="image/1.jpeg" alt="">
                        </div>
                        <div class="header-detail col-12 pb-3">
                            <div class="row">
                                <div class="col-10 ">
                                    <h3 class="text-bold text-font-size">مسعود آقایی ساداتی&nbsp;<!--  <i style="color:#048af7;font-size: 20px;" class="fas fa-check-circle"></i> --></h3>
                                    <h6 class="text-secondary"><i class="fas fa-map-marker-alt"></i>&nbsp;تهران,شهرک طالقانی,ساحتمان نگین</h6>
                                    <h6 class="explain-about-page">مدیر شرکت آفرینه و مسپول سایت اینولینکس .به صفحه من خوش آمدید میتوانید مطالب مرتبط به شرکت آفرینه و کارآفرینی و کسب و کار را در اینجا مشاهده کنید </h6>
                                    <div class="col-12 mt-4 font">
                                        <div class="row vm-navbar">
                                            <button class="btn rounded-pill mb-1 col-custom font btn-mw-profile text-center visit-btn mx-0 mx-sm-1"><i class="fas fa-external-link-alt padding-button ml-2 icon-size"></i>بازدید سایت </button>
                                            <div class="col-12 col-md-3 justify-content-start navbar dropdown dropleft pr-1">
                                                <button type="button" data-toggle="dropdown" class="pt-custome-more-btn btn btn-mw-profile rounded-pill col-12 font text-center col-md-6 mr-2">بیشتر</button>
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
                        <!--
                            <div class="col-12 tab-header-main mt-3 ">
                                <div class="row  scroll-main-height">
                                    <ul class="nav nav-tabs direction text-center" role="tablist">
                                        <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='post'}  on:click="{() => current = 'post'}" data-toggle="tab" href="#post">پست</a></li>
                                        <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='about'}  on:click="{() => current = 'about'}"  data-toggle="tab" href="#about">درباره</a></li>
                                    </ul>
                                </div>
                            </div>
                        -->
                    </div>
                </div>
            </div>
            <div class="w-100 mr-0">
                <div id="post" class="row ">
                    <div class="row px-0 mx-0" >
                        <aside class="col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ">
                            <section class="row mx-0 mt-3 mr-0 pt-0  ">
                                <div class="col-12 p-0 main-article ">
                                    <article class="p-0  shadow-radius-section shadow-section mb-4 bg-light">
                                        <div class="col-12">
                                            <div class="row justify-content-between p-2 pl-4 pl-md-2">
                                                <div class="col-11 col-md-11" >
                                                    <div class="row ">
                                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                                            <img class="cu-image mr-1 " src="image/1.jpeg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="magezine" class="title-post-link">مسعود آفایی ساداتی&nbsp; <!-- <i style="color:#048af7;" class="fas fa-check-circle"></i> --></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ">
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
                                            <h3  class="title-post mt-1 mb-0 py-3 pr-3"><a class="title-post-link" href="magezine/show-detail">به اینولینکس خوش آمدید</a></h3>
                                        </div>
                                        <div class="col-12 p-0 mx-0 responsive-imagePost-height">
                                            <img src="image/30.jpg" class="p-0 mr-0 w-100 responsive-imagePost-height" alt="">
                                        </div>
                                        
                                        <p class="post-text col-12 mt-3 post-text">
                                            <span class="content d-inline"> طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .</span>
                                            <!-- svelte-ignore missing-declaration -->
                                            <span class="read-more-custom" onclick="readMore(this)" style="cursor: pointer;">بیشتر بخوانید</span>
                                            <span class="read-more ">
                                                <div class="row pl-0 ml-0 pt-2 justify-content-end ">
                                                    <a href="magezine/show-detail" class="col-3 col-md-2 px-0">
                                                        <button class="btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family">ادامه مطلب</button>
                                                    </a>
                                                </div>
                                            </span>
                                            
                                        </p>
                                        <div class="col-12 mb-1 author-show-box pt-1">
                                            
                                            <div class="view-count"><i class="fas fa-eye"></i> ۵۶</div>
                                        </div>
                                    </article>
                                    <article class="p-0  shadow-radius-section shadow-section mb-4 bg-light">
                                        <div class="col-12">
                                            <div class="row justify-content-between p-2 pl-4 pl-md-2">
                                                <div class="col-11 col-md-11" >
                                                    <div class="row ">
                                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                                            <img class="cu-image mr-1 " src="image/1.jpeg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="magezine" class="title-post-link">مسعود آفایی ساداتی&nbsp; <!-- <i style="color:#048af7;" class="fas fa-check-circle"></i> --></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ">
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
                                            <h3  class="title-post mt-1 mb-0 py-3 pr-3"><a class="title-post-link" href="magezine/show-detail">به اینولینکس خوش آمدید</a></h3>
                                        </div>
                                        <div class="col-12 p-0 mx-0 responsive-imagePost-height">
                                            <img src="image/30.jpg" class="p-0 mr-0 w-100 responsive-imagePost-height" alt="">
                                        </div>
                                        
                                        <p class="post-text col-12 mt-3 post-text">
                                            <span class="content d-inline"> طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .</span>
                                            <!-- svelte-ignore missing-declaration -->
                                            <span class="read-more-custom" onclick="readMore(this)" style="cursor: pointer;">بیشتر بخوانید</span>
                                            <span class="read-more ">
                                                <div class="row pl-0 ml-0 pt-2 justify-content-end ">
                                                    <a href="magezine/show-detail" class="col-3 col-md-2 px-0">
                                                        <button class="btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family">ادامه مطلب</button>
                                                    </a>
                                                </div>
                                            </span>
                                            
                                        </p>
                                        <div class="col-12 mb-1 author-show-box pt-1">
                                            
                                            <div class="view-count"><i class="fas fa-eye"></i> ۵۶</div>
                                        </div>
                                    </article>
                                    <article class="p-0  shadow-radius-section shadow-section mb-4 bg-light">
                                        <div class="col-12">
                                            <div class="row justify-content-between p-2 pl-4 pl-md-2">
                                                <div class="col-11 col-md-11" >
                                                    <div class="row ">
                                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                                            <img class="cu-image mr-1 " src="image/1.jpeg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="magezine" class="title-post-link">مسعود آفایی ساداتی&nbsp; <!-- <i style="color:#048af7;" class="fas fa-check-circle"></i> --></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ">
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
                                            <h3  class="title-post mt-1 mb-0 py-3 pr-3"><a class="title-post-link" href="magezine/show-detail">به اینولینکس خوش آمدید</a></h3>
                                        </div>
                                        <div class="col-12 p-0 mx-0 responsive-imagePost-height">
                                            <img src="image/30.jpg" class="p-0 mr-0 w-100 responsive-imagePost-height" alt="">
                                        </div>
                                        
                                        <p class="post-text col-12 mt-3 post-text">
                                            <span class="content d-inline"> طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.
            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .</span>
                                            <!-- svelte-ignore missing-declaration -->
                                            <span class="read-more-custom" onclick="readMore(this)" style="cursor: pointer;">بیشتر بخوانید</span>
                                            <span class="read-more ">
                                                <div class="row pl-0 ml-0 pt-2 justify-content-end ">
                                                    <a href="magezine/show-detail" class="col-3 col-md-2 px-0">
                                                        <button class="btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family">ادامه مطلب</button>
                                                    </a>
                                                </div>
                                            </span>
                                            
                                        </p>
                                        <div class="col-12 mb-1 author-show-box pt-1">
                                            
                                            <div class="view-count"><i class="fas fa-eye"></i> ۵۶</div>
                                        </div>
                                    </article>
                                </div>
                            </section>
                        </aside>
                        <!--<aside  class=" col-12 col-md-3 mt-3 ">
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
                        </aside>
                        -->
                    </div>
                </div>
            </div>
        </aside>
    </div>
</main>
<br><br>
</Router>
