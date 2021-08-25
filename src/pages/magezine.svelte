<script>
  import {onMount} from "svelte";
  import jQuery from 'jquery';
  import {fade , slide , scale , fly} from "svelte/transition";
  import { Loader } from "@googlemaps/js-api-loader"
  import { Router, Link, Route } from "svelte-routing";
  import {circIn} from "svelte/easing";
  import showDetail from "./show-detail.svelte";
  import profile from "./profile.svelte";
  export let url = "";
  export let y;
  export let x;
  let innerHeight;
  let clientHeight;
  //$: console.log(x);
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.has('id');
  //console.log(id);
  let isOpen = false;
  let current = 'post';
  function toggleNav(){
      isOpen =! isOpen;       
  }
  //let y=0;
  var currentLocation = window.location.href;
  var splitUrl = currentLocation.split("/");
  var lastSugment = splitUrl[splitUrl.length - 1];
  window.jQuery = jQuery;
   //$ : console.log(y);
  ////
  //$ : console.log(clientHeight)
  // 
  // jQuery(function(){
  //   jQuery(".category_button").click(function(){
  //     var h = window.innerHeight;	
  //     var stickHeight = jQuery('.stick').height();
  //     var windowScroll = jQuery(window).scrollTop();
  //     var stickOffset = jQuery('.stick').offset().top;
  //     var stickHereOffset = jQuery('.stick-here').offset().top;
  //     console.log(jQuery(window).scrollTop())
  //     console.log(jQuery('.stick').offset().top)
  //     console.log(jQuery('.stick-here').offset().top)
  //     console.log(stickHeight)
  //     console.log(h)
  //     console.log(jQuery('body').outerHeight())
  //     //console.log(jQuery('.stick').scrollTop())
  //     if(stickHeight > 500){
  //       if (windowScroll + h > stickHereOffset + 22) {
  //       jQuery('.stick').addClass('sticky-bottom');
  //       jQuery('.stick-here').height(jQuery('.stick').outerHeight());
  //     } 
      
  //     if (windowScroll + stickHereOffset < stickOffset + (22 * 2)) {
  //         jQuery('.stick').removeClass('sticky-bottom');
  //         jQuery('.stick-here').height(0);
  //     }
  //     }
      
  //   })
  // })
</script>
<style>
    @import "public/global.css";
    
</style>
<svelte:window bind:scrollY={y} bind:innerWidth={x} bind:innerHeight/>

<svelte:head>
    <title>
        مجله
    </title>
</svelte:head>

<Router url="{url}">

{#if y>450}
<section class="row nav-mag-scroll pr-0 mr-0 bg-light mt-0 d-none d-md-inline" > 
    
    <div transition:slide class="col-12 scroll-div bg-light pr-0 mr-5 nav-custome-top">
        <div class="row justify-content-between shadow-sm mr-0">
            <div class="col-8 col-md-4 direction my-auto" >
                <div class="row justify-content-end vm-navbar">
                    <button class="btn rounded-pill font btn-mw-scroll text-center visit-btn mx-0 "><i class="fas fa-external-link-alt padding-button ml-2 icon-size-scroll"></i>بازدید سایت </button>

                    <div class="navbar-scroll col-5 mr-0 justify-content-start navbar dropleft px-2">
                        <button  type="button" data-toggle="dropdown" class="pt-0 pl-md-3 pr-md-3 px-lg-3 btn btn-sm btn-mw-scroll rounded-pill col-12 font text-center col-md-7 mr-2"
                        >بیشتر</button>
                        
                        <ul class="dropdown-menu  ellipsis-menu ml-2">
                            <li class="dropdown-item"><a href="#"><i class="fas fa-share-alt"></i> اشتراک صفحه </a></li>
                            <li class="dropdown-item"><a href="#"><i class="fas fa-flag"></i> گزارش دادن</a></li>
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
                    <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='about'} on:click="{() => current = 'about'}"  data-toggle="tab" href="#about">درباره</a></li>
                    <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='post'} on:click="{() => current = 'post'}" data-toggle="tab" href="#post">پست</a></li>
                </ul>
            </div>
        </div>
    </div>
    
</section>
{/if}



<main transition:scale class="container-fluid pin-parent px-0">
    
    <div class="row justify-content-center mx-0">
        
        <aside class="col-12 col-md-3 mr-1 d-none d-lg-inline px-0" >
            <div class="row mx-0 w-100">
                <div class="col-12 shadow-radius-section bg-light px-0 py-0">
                    <div class="row w-100 mx-0">
                        <div class="col-12 px-0">
                           <a href="#">
                                <img class="h-auto w-100 dream-job-image " src="image/job.jpg" alt="">
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
        <aside class="col-12 col-lg-8  ">
            <div class="row ml-lg-0 ">
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
                                    <h4 class="font-weight-normal text-font-size">آفرینه&nbsp;<i style="color:#048af7;font-size: 20px;" class="fas fa-check-circle"></i></h4>
                                    <h6 class="text-secondary"><i class="fas fa-map-marker-alt"></i>&nbsp;تهران,میدان شیخ بهایی,ساختمان اوستا</h6>
                                    <h6 class="explain-about-page">به آفرینه محلق شوید و بروز باشید.میتوانید مطالب مرتبط به کارآفرینی و بازاریابی رو از اینجا دنبال کنید اگر از محتوای ما خوشتان اومد آنرابا دیگران به اشتراک بگذارید.</h6>
                                    <div class="col-12 mt-4 font">
                                        <div class="row vm-navbar">
                                            <button class="btn rounded-pill mb-1 font btn-mw text-center visit-btn mx-0 mx-sm-1"><i class="fas fa-external-link-alt padding-button ml-2 icon-size"></i>بازدید سایت </button>
                                            <div class="{x<=320 ? 'col-12' : 'col-5'} col-md-3 justify-content-start navbar dropleft pr-1">
                                                <button type="button" data-toggle="dropdown" class="pt-custome-more-btn btn btn-mw rounded-pill col-12 font text-center col-md-6 mr-2">بیشتر</button>
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
                                        <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='about'}  on:click="{() => current = 'about'}"  data-toggle="tab" href="#about">درباره</a></li>
                                        <li class="nav-item-scroll mt-2"><a class="py-2 nav-link-scroll" class:active={current==='post'}  on:click="{() => current = 'post'}" data-toggle="tab" href="#post">پست</a></li>
                                    </ul>
                                </div>
                            </div>
                            
                    </div>
                </div>
            </div>
            
            <div class="tab-content w-100 mr-0 ">
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
                                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="magezine" class="title-post-link">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ">
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
                                        
                                        <p class="post-text px-4 col-12 mt-3 px-4 ">
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
                                            <a class="a-clicked" href="profile">
                                                <img class="personal-img" src="image/1.jpeg" alt="">
                                                <span class="personal-name"> مسعودآقایی ساداتی</span>&nbsp;&nbsp;
                                            </a>
                                            <div class="view-count"><i class="fas fa-eye"></i> ۵۶</div>
                                        </div>
                                    </article>
                                    <article class="p-0  shadow-radius-section shadow-section mb-4 bg-light">
                                        <div class="col-12">
                                            <div class="row justify-content-between p-2 pl-4 pl-md-2">
                                                <div class="col-11 col-md-11" >
                                                    <div class="row ">
                                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="magezine" class="title-post-link">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ">
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
                                        
                                        <p class="post-text px-4 col-12 mt-3 ">
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
                                            <a class="a-clicked" href="profile">
                                                <img class="personal-img" src="image/1.jpeg" alt="">
                                                <span class="personal-name"> مسعودآقایی ساداتی</span>&nbsp;&nbsp;
                                            </a>
                                            <div class="view-count"><i class="fas fa-eye"></i> ۵۶</div>
                                        </div>
                                    </article>
                                    <article class="p-0  shadow-radius-section shadow-section mb-4 bg-light">
                                        <div class="col-12">
                                            <div class="row justify-content-between p-2 pl-4 pl-md-2">
                                                <div class="col-11 col-md-11" >
                                                    <div class="row ">
                                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                                        </div>
                                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ">
                                                            <div class="cu-intro mt-2">
                                                                <h6><a href="magezine" class="title-post-link">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div class="report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ">
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
                                        
                                        <p class="post-text px-4 col-12 mt-3 ">
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
                                            <a class="a-clicked" href="profile">
                                                <img class="personal-img" src="image/1.jpeg" alt="">
                                                <span class="personal-name"> مسعودآقایی ساداتی</span>&nbsp;&nbsp;
                                            </a>
                                            <div class="view-count"><i class="fas fa-eye"></i> ۵۶</div>
                                        </div>
                                    </article>
                                </div>
                            </section>
                        </aside>
                        <aside class="col-12 col-md-3 mt-3">
                            <div class="row px-0 text-center shadow-radius-section bg-light " class:d-none={x<=767}>
                                <div class="col-10 mx-auto mt-3 mb-3 ">
                                    <img class="company-img  w-100" src="image/afarine.jpg" alt="">
                                </div>
                                <h3 class="col-12">
                                    آفرینه
                                </h3>
                                <h6 class="col-12 slogan">
                                    زندگی به سبک نوآوری
                                </h6>
                            </div>
                            <div class="{y>700 && x>767 ? 'sticky-top-custom':''}">
                            <!-- <div bind:clientHeight class="stick h-auto"> -->
                              <div class=" {x >=767 ? 'row direction shadow-radius-section mt-4 py-2 bg-white': 'row direction '} " >
                                <div class="{x >=767 ? 'col-12 font-weight-bold pb-2 border-bottom pr-0': 'col-12 font-weight-bold'}">
                                    <!-- svelte-ignore a11y-missing-attribute -->
                                    <a type="{x<=767 ? 'button' : ''}" class="btn " data-toggle="{x<=767 ? 'modal' :''}"   data-target="{x<=767 ? '#mod2' : ''}">
                                        <i class="{x>=767 ? 'fas fa-list-ul category-icon-modal' : 'fas fa-caret-left'} "  class:category-fixed-icon-modal={x<=767 && y>=400} ></i>
                                    </a><span class="d-none d-md-inline">دسته بندی </span>
                                </div>
                                <div class="modal-category-main {x<=767 ? 'modal right ' : ''} mt-2 mr-1 col-12 p-0 d-lg-inline" id="{x<=767 ? 'mod2' : ''}" tabindex="{x<=767 ? '-1' : ''}" role="{x<=767 ? 'dialog' : ''}" aria-hidden="true">
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
                                            <div class="border-bottom pb-2" id="">
                                                <h5 class="mb-0">
                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                  <a href="#" class="category-main-text-link">
                                                    <p class="category-main-text d-inline">همه</p>
                                                  </a>
                                                </h5>
                                        </div>   
                                        <div class="border-bottom pb-2" id="headingOne">
                                            <h5 class="mb-0 mt-2">
                                              <a class="p-0 d-inline  category_button collapsed " data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne"></a>
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
                                                            <div class="my-1 pl-2 ">
                                                                <div class="border-bottom pb-2" id="">
                                                                    <h5 class="mb-0">
                                                                      <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                                      <a href="#" class="category-main-text-link">
                                                                        <p class="category-main-text d-inline">ورزش</p>
                                                                      </a>
                                                                    </h5>
                                                                </div> 
                                                          </div>
                                                        </div>
                                                        <div class="my-2 pl-2">
                                                          <div class="border-bottom pb-2" id="headingTwoTwo">
                                                            <h5 class="mb-0">
                                                              <a href="#" class="p-0 d-inline category_button collapsed" data-toggle="collapse" data-target="#collapseTwoTwo" aria-expanded="false" aria-controls="collapseTwoTwo"></a>
                                                              <a href="#" class="category-main-text-link">
                                                                <p class="category-main-text d-inline">مدیریت تکنولوژی</p>
                                                              </a>
                                                            </h5>
                                                          </div>
                                                          <div id="collapseTwoTwo" class="collapse mr-3" aria-labelledby="headingTwoTwo" data-parent="#accordion1">
                                                            <div class="border-bottom py-2" id="">
                                                                <h5 class="mb-0">
                                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                                  <a href="#" class="category-main-text-link">
                                                                    <p class="category-main-text d-inline">خاورمیانه</p>
                                                                  </a>
                                                                </h5>
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
                                                                            <div class="border-bottom py-2" id="">
                                                                                <h5 class="mb-0">
                                                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                                                  <a href="#" class="category-main-text-link">
                                                                                    <p class="category-main-text d-inline">فوتبال</p>
                                                                                  </a>
                                                                                </h5>
                                                                            </div> 
                                                                          </div>
                                                                        </div>
                                                                        <div class="border-bottom pb-2" id="">
                                                                            <h5 class="mb-0">
                                                                              <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                                              <a href="#" class="category-main-text-link">
                                                                                <p class="category-main-text d-inline">خاورمیانه</p>
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
                                          <div class="border-bottom pb-2" id="headingOne">
                                            <h5 class="mb-0 mt-2">
                                              <a class="p-0 d-inline  category_button collapsed " data-toggle="collapse" data-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne"></a>
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
                                                            <div class="my-1 pl-2 ">
                                                                <div class="border-bottom pb-2" id="">
                                                                    <h5 class="mb-0">
                                                                      <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                                      <a href="#" class="category-main-text-link">
                                                                        <p class="category-main-text d-inline">ورزش</p>
                                                                      </a>
                                                                    </h5>
                                                                </div> 
                                                          </div>
                                                        </div>
                                                        <div class="my-2 pl-2">
                                                          <div class="border-bottom pb-2" id="headingTwoTwo">
                                                            <h5 class="mb-0">
                                                              <a href="#" class="p-0 d-inline category_button collapsed" data-toggle="collapse" data-target="#collapseTwoTwo" aria-expanded="false" aria-controls="collapseTwoTwo"></a>
                                                              <a href="#" class="category-main-text-link">
                                                                <p class="category-main-text d-inline">مدیریت تکنولوژی</p>
                                                              </a>
                                                            </h5>
                                                          </div>
                                                          <div id="collapseTwoTwo" class="collapse mr-3" aria-labelledby="headingTwoTwo" data-parent="#accordion1">
                                                            <div class="border-bottom py-2" id="">
                                                                <h5 class="mb-0">
                                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                                  <a href="#" class="category-main-text-link">
                                                                    <p class="category-main-text d-inline">خاورمیانه</p>
                                                                  </a>
                                                                </h5>
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
                                                                            <div class="border-bottom py-2" id="">
                                                                                <h5 class="mb-0">
                                                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                                                  <a href="#" class="category-main-text-link">
                                                                                    <p class="category-main-text d-inline">فوتبال</p>
                                                                                  </a>
                                                                                </h5>
                                                                            </div> 
                                                                          </div>
                                                                        </div>
                                                                        <div class="border-bottom pb-2" id="">
                                                                            <h5 class="mb-0">
                                                                              <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                                              <a href="#" class="category-main-text-link">
                                                                                <p class="category-main-text d-inline">خاورمیانه</p>
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
                                            <div class="border-bottom py-2" id="">
                                                <h5 class="mb-0">
                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                  <a href="#" class="category-main-text-link">
                                                    <p class="category-main-text d-inline">خاورمیانه</p>
                                                  </a>
                                                </h5>
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
                                            <div class="border-bottom py-2" id="">
                                                <h5 class="mb-0">
                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                  <a href="#" class="category-main-text-link">
                                                    <p class="category-main-text d-inline">راهیان نور</p>
                                                  </a>
                                                </h5>
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
                                            <div class="border-bottom py-2" id="">
                                                <h5 class="mb-0">
                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                  <a href="#" class="category-main-text-link">
                                                    <p class="category-main-text d-inline">راهیان نور</p>
                                                  </a>
                                                </h5>
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
                                            <div class="border-bottom py-2" id="">
                                                <h5 class="mb-0">
                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                  <a href="#" class="category-main-text-link">
                                                    <p class="category-main-text d-inline">راهیان نور</p>
                                                  </a>
                                                </h5>
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
                                            <div class="border-bottom py-2" id="">
                                                <h5 class="mb-0">
                                                  <i class="fas fa-dot-circle p-0 d-inline category_button-non" ></i>
                                                  <a href="#" class="category-main-text-link">
                                                    <p class="category-main-text d-inline">راهیان نور</p>
                                                  </a>
                                                </h5>
                                            </div> 
                                          </div>
                                        </div>
                                      </div>
                                </div>
                              </div>
                              <div class="stick-here"></div>
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
                                        <div class="col-6 text-bold pr-0">وبسایت</div>
                                        <div class="col-6 text-bold pr-0 mb-4">
                                            <a class="text-primary" href="#">
                                                http://afarine.com/
                                            </a>
                                        </div>
                                        <div class="col-6 text-bold pr-0">نوع فعالیت</div>
                                        <div class="col-6 pr-0 mb-4 text-secondary">
                                            کارآفرینی و کسب و کار - خصوصی
                                        </div>
                                        <div class="col-6 text-bold pr-0">میزان استخدام</div>
                                        <div class="col-6 pr-0 mb-4 text-secondary">
                                            ۱۲۰ + کارمند
                                        </div>
                                        <div class="col-6 text-bold pr-0">تاریخ تاسیس</div>
                                        <div class="col-6 pr-0 mb-4 text-secondary">
                                            ۲۰۱۸
                                        </div>
                                        <div class="col-6 text-bold pr-0">تخصص ها</div>
                                        <div class="col-6 pr-0 mb-4 text-secondary">
                                           اشتغال/بازاریابی/کسب و کار/
                                        </div>
                                        <div class="col-6 text-bold pr-0">آدرس اصلی</div>
                                        <div class="col-6 pr-0 mb-4 text-secondary">
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


