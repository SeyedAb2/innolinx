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
    <div class="row justify-content-center mx-lg-2">
        <aside class="col-12 col-md-2  mx-1 mt-5 mt-md-0 bg-light shadow-radius-section">hello</aside>
        <aside class="col-12 col-md-7 mx-2 order-first order-md-0 ">
            <section class="row justify-content-md-center mx-0 pt-3 bg-light shadow-radius-section" >
                <div class="col-12 mb-4 my-md-0">
                    <article class="col-12 bg-danger mb-md-4 first-article-main">
                        <img class="image-pin-top" src="image/30.jpg" alt="">
                        <a class="w-100 content-pin-top" href="#">
                            <h5>جدیدترین اخبار از تحریم فیس بوک توسط آمریکا</h5>
                        </a>
                        <a href="#">
                            <img src="/image/26.jpeg" class="mag-img-top" alt="">
                        </a>
                        <div class="author-time-pin-top">
                            <span>برنامه تلویزیونی جهان آرا <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۲ ماه قبل
                        </div>
                    </article>
                </div>
                <div class="col-12 col-xl-6 mb-4 my-md-0 pin-article-main">
                    <article class="col-12">
                        <img class="image-pin w-100" src="image/28.jpg" alt="">
                        <a class="w-100 content-pin" href="#">
                            <h5>جدیدترین اخبار از تحریم فیس بوک توسط آمریکا</h5>
                        </a>
                        <a href="#">
                            <img src="/image/27.png" class="mag-img" alt="">
                        </a>
                        <div class="author-time-pin">
                            <span>فیس بوک <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۲ ماه قبل
                        </div>
                    </article>
                </div>
                <div class="col-12 col-xl-6 mb-4 mt-lg-0 mt-md-4  pin-article-main">
                    <article class="col-12">
                        <img class="image-pin w-100" src="20.jpg" alt="">
                        <a class="w-100 content-pin" href="#">
                            <h5>به اینولینکس خوش آمدید</h5>
                        </a>
                        <a href="#">
                            <img src="/image/25.jpg" class="mag-img" alt="">
                        </a>
                        <div class="author-time-pin">
                            <span>خبرگذاری تسنیم <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۲ ماه قبل
                        </div>
                    </article>
                </div>
            </section>
            <section class="row mx-0 mt-3 mr-0 pt-0 bg-light ">
                <div class="col-12 p-0 main-article">
                    <article class="p-0 shadow-radius-section shadow-section mb-3">
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
                    <article class="p-0 shadow-radius-section shadow-section mb-3">
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
                    <article class="p-0 shadow-radius-section shadow-section mb-3">
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
        <aside class="col-12 col-md-2 mx-1 mt-5 mt-md-0 bg-light shadow-radius-section" >hello</aside>
        
    </div>
    
</main>
<br><hr class="col-10 offset-1"><br><br><br>


<!-- 

    <div class="container-fluid">
                <article style="height: 63vh;" class="col-12 mx-lg-auto p-0 height-pin3 pin-article">
                    <div class="img-pin-div">
                        <img class="w-100 d-flex img-pin" src="image/30.jpg" alt="">
                    </div>
                    <div class="content-pin">
                        <h5>
                           <a style="direction: rtl;" class="pin-title pin-title1" href="">نسل جدید تبلت های هوشمند قابلیت بهره گیری از اینترمنت 5G</a> 
                        </h5>
                    </div>
                    <a href="#">
                        <img src="/image/26.jpeg" class="mag-img" alt="">
                    </a>
                    <div class="author-time-pin">
                        <span>برنامه تلویزیونی جهان آرا <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۴ روز قبل
                    </div>
                </article>
                <article class="col-12 height-main mt-2 px-4">
                    <div class="row px-lg-0 justify-content-md-between" style="height: 40vh;">
                        <article class="col-12 col-md-5 ml-md-5 p-0 pin-article height-pin height-pin1 mb-2 mb-lg-0">
                            <div class="img-pin-div">
                                <img class="w-100 d-flex img-pin" src="20.jpg" alt="">
                            </div>
                            <div class="content-pin">
                                <h5>
                                   <a style="font-size: 15px;" class="pin-title" href="">سلام به اینولینکس خوش آمدید</a> 
                                </h5>
                            </div>
                            <a href="#">
                                <img src="/image/25.jpg" class="mag-img" alt="">
                            </a>
                            <div class="author-time-pin">
                                <span>خبرگذاری تسنیم <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۲ ماه قبل
                            </div>
                        </article>
                        <article class="col-12 col-md-5 mr-md-5 p-0 pin-article height-pin height-pin2 ">
                            <div class="img-pin-div">
                                <img class="w-100 d-flex img-pin" src="image/28.jpg" alt="">
                            </div>
                            <div class="content-pin">
                                <h5>
                                   <a style="font-size: 15px;" class="pin-title" href="">شبکه اجتماعی فیس بوک فیلتر شد</a> 
                                </h5>
                            </div>
                            <a href="#">
                                <img src="/image/27.png" class="mag-img" alt="">
                            </a>
                            <div class="author-time-pin">
                                <span>فیس بوک <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۱ دقیقه قبل
                            </div>
                        </article>
                    </div>
                </article>
                <div class="row ">
                    
                </div>
            </div>
  -->
