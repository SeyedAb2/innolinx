<script>
    import {onMount} from "svelte";
    import "../App.svelte";
    import {fade , slide , scale , fly} from "svelte/transition";
    import {circIn} from "svelte/easing";
    import { Router, Link, Route } from "svelte-routing";
    import about from "./about.svelte";
    export let url = "";
    export let y;
    
    //let y=0;
</script>
<style>
    @import "public/global.css";
</style>
<svelte:window bind:scrollY={y}/>
<svelte:head>
    <title>
        اینولینکس
    </title>
</svelte:head>
<main transition:scale class="container-fluid pin-parent ">
    <div class="row justify-content-center mx-0">
        
        <aside class="col-12 col-md-3 mr-2 " >
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
        <aside class="col-12 col-md-8  ">
            <div class="row ml-1 ">
                <div class="col-12 ">
                    <div class="row p-0 shadow-radius-section " >
                        <div class="col-12 p-0">
                            <img class="w-100 header-image bg-light" src="image/head.jpeg" alt="">
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
                                            <button class="btn btn-danger rounded-pill col-5 font text-center col-md-3 mx-1">بازدید سایت <i class="fas fa-external-link-alt"></i></button>
                                            <div class="col-5 justify-content-start dropdown dropleft">
                                                <button type="button" data-toggle="dropdown" class="btn btn-danger rounded-pill col-12 font text-center col-md-6 mx-1">بیشتر</button>
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
                    </div>
                </div>
            </div>
            <div class="row">
                <aside class="col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ">
                    <section class="row mx-0 mt-3 mr-0 pt-0  ">
                        <div class="col-12 p-0 main-article bg-light">
                            <article class="p-0 shadow-radius-section shadow-section mb-3 bg-light">
                                <div class="col-12">
                                    <div class="row justify-content-between p-2 ">
                                        <div class="col-11 col-md-11" >
                                            <div class="row ">
                                                <div class="col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1" >
                                                    <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                                </div>
                                                <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center ">
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
                                    <h3  class="title-post mt-1 mb-0 py-3 pr-3"><a href="#">به اینولینکس خوش آمدید</a></h3>
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
                                <hr class="col-11 mx-auto">
                                <div class="col-12 mb-3">
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
                                    <img src="20.jpg" class="p-0 mr-0 w-100 responsive-imagePost-height" alt="">
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
                <aside class="col-12 col-md-3 mt-3 ">
                    <div class="row px-0 text-center shadow-radius-section bg-light ">
                        <div class="col-10 ml-2 mt-5 mb-3 ">
                            <img class="company-img ml-3" src="image/afarine.jpg" alt="">
                        </div>
                        <h3 class="col-12">
                            آفرینه
                        </h3>
                        <h6 class="col-12">
                            زندگی به سبک نوآوری
                        </h6>
                    </div>
                </aside>
            </div>
        </aside>
    </div>
    
</main>
<br><hr class="col-10 offset-1"><br><br><br>


