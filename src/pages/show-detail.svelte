<script>
    import {onMount} from "svelte";
    import {fade , slide , scale , fly} from "svelte/transition";
    import { Loader } from "@googlemaps/js-api-loader"
    import { Router, Link, Route } from "svelte-routing";
    import {circIn} from "svelte/easing";
    export let url = "";
    export let y;
    let fontSize=13.5;
    let lineHeight=27;
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.has('id');
    //console.log(id);
    let isOpen = false;
    function toggleNav(){
        isOpen =! isOpen;       
    }
    //let y=0;
    var currentLocation = window.location.href;
    var splitUrl = currentLocation.split("/");
    var lastSugment = splitUrl[splitUrl.length - 1];
    // $ : console.log(lastSugment);
</script>
<style>
    @import "public/global.css";
    
</style>
<svelte:window bind:scrollY={y}/>
<svelte:head>
    <title>
       جزییات مقاله
    </title>
</svelte:head>

<main transition:scale class="container-fluid pin-parent px-0">
    
    <div class="row justify-content-center mx-0">
        
        <aside class="col-12 col-md-3 mr-1 d-none d-lg-inline px-0" >
            <div class="row mx-0 w-100">
                <div class="col-12 shadow-radius-section bg-light px-0 py-0">
                    <div class="row w-100 mx-0">
                        <div class="col-12 px-0">
                           <a href="#">
                                <img class="w-100 h-auto dream-job-image " src="image/job.jpg" alt="">
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
        <aside class="col-12 col-md-12 col-lg-8 px-0">   
            <div class="row px-0 mx-0" >
                <aside class="col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ">
                    <section class="row mx-0 mt-1 mr-0 pt-0  ">
                        <div class="col-12 p-0 main-article ">
                            <article class="p-0  shadow-radius-section shadow-section mb-4 bg-light">
                                <div class="col-12">
                                    <div class="row justify-content-between p-2 pl-4 pl-md-2">
                                        <div class="col-11 col-md-11" >
                                            <div class="row ">
                                                <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                                    <img class="cu-image-com mr-1 " src="../image/afarine.jpg" alt="">
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
                                    <h3 class="title-post mt-1 mb-0 py-3 pr-3"><a class="title-post-link" href="#">به اینولینکس خوش آمدید</a></h3>
                                </div>
                                <div class="col-12 p-0 mx-0 h-auto">
                                    <img src="../image/12.jpeg" class="p-0 mr-0 w-100 responsive-imagePost-height" alt="">
                                </div>
                                <div  id="menu" data-stickyType="window" data-stickonscroll="responsive-imagePost-height" class="col-12 mt-2 px-4 shadow-sm bg-light pt-1" style="z-index: 3;">
                                    <i class="font-icon-plus fas fa-font" on:click={e => fontSize++ } on:click={e => lineHeight+= 1.5 }></i>&nbsp;
                                    <i class="font-icon-minus fas fa-font fa-sm"  on:click={e => fontSize-- } on:click={e => lineHeight-= 1.5 }></i>
                                </div>
                                <p style="font-size: {fontSize + 'px'}; line-height: {lineHeight + 'px'}" class="col-12 mt-1 px-4 post-text">
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی 
                                    برای پر کردن صفحه و ارایه اولیه شکل 
                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،
                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،
                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.
                                   
                                </p>
                                <div class="col-12 ">
                                    <a href="#">
                                        <button id="read-more" class="btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10">ادامه مطلب</button>
                                    </a>
                                </div>
                                
                                <div class="col-12 mb-1 author-show-box pt-1">
                                    <a class="a-clicked" href="#">
                                        <img class="personal-img" src="../image/1.jpeg" alt="">
                                        <span class="personal-name"> مسعودآقایی ساداتی</span>&nbsp;&nbsp;
                                    </a>
                                    <div class="view-count"><i class="fas fa-eye"></i> ۵۶</div>
                                </div>
                            </article>
                        </div>
                    </section>
                </aside>
                <aside class="{y>40 ? 'sticky-top-show-detail-aside ' : ''} mt-1 h-100 col-12 col-md-3 d-none d-md-inline">
                    <div class="row px-0 text-center shadow-radius-section bg-white ">
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
                    <div class=" row px-0 text-center shadow-radius-section bg-white mt-3">
                        <div class="col-12 mt-4 header-image-main border-radius justify-content-center">
                            <img class="header-banner-image-person-sidebar border-radius" src="image/1.jpeg" alt="">
                        </div>
                        <div class="header-detail-show-sidebar col-12 pb-3">
                            <div class="row">
                                <div class="col-10 px-0">
                                    <h6 class="font-weight-normal author-sidebar">مسعود آقایی ساداتی&nbsp;<!--  <i style="color:#048af7;font-size: 20px;" class="fas fa-check-circle"></i> --></h6>
                                    <div class="col-12 mt-4 font mx-0 px-0">
                                        <!-- svelte-ignore a11y-invalid-attribute -->
                                        <a href="#">
                                            <button class="btn-sidebar px-0 mx-0 btn-sm col-12 font btn btn-danger text-white rounded-circle rounded-pill">
                                                ارتباط بگیرید
                                            </button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </aside>
    </div>
</main>
<br><br>

