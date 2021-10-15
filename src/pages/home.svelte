<script>
	import Magezine from './magezine.svelte';
    import {onMount} from "svelte";
    import {fade , slide , scale , fly} from "svelte/transition";
    import {circIn} from "svelte/easing";
    import { Router, Link, Route } from "svelte-routing";
    import about from "./about.svelte";
    import showDetail from "./show-detail.svelte";
    export let url = "";
    export let id =1;
    export let y;
    export let x;
    export let h;
    /*export let post = [];
	onMount(
		async() => {
			const res = await fetch('http://localhost:8000/post/page/1/')
			post = await res.json()
			post = post.data
			
		}
	)*/
    
    var currentLocation = window.location.href;
    var splitUrl = currentLocation.split("/");
    var lastSugment = splitUrl[splitUrl.length - 1];
    //$ : console.log(lastSugment);
    
    //let y=0;
</script>
<style>
    @import "public/global.css";
</style>
<svelte:window bind:scrollY={y} bind:innerWidth={x} bind:innerHeight={h}/>
<svelte:head>
    <title>
        اینولینکس
    </title>
</svelte:head>
<main transition:scale class="container-fluid pin-parent ">
    <div class="row justify-content-center mx-lg-2">
        <aside class="col-12 col-md-3  mx-1 mt-5 mt-md-0 bg-light shadow-radius-section">hello</aside>
        <aside class="col-12 col-md-6 mx-2 order-first order-md-0 ">
            <section class="row justify-content-md-center mx-0 pt-3 bg-light shadow-radius-section" >
                <div class="col-12 mb-4 my-md-0">
                    <article class="col-12 mb-md-4 first-article-main " class:pin-article-height={h<=465}>
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
                    <article class="col-12" class:pin-article-height={h<=465}>
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
                <div class="col-12 col-xl-6 mb-4 mt-lg-4 mt-xl-0 mt-md-4  pin-article-main">
                    <article class="col-12" class:pin-article-height={h<=465}>
                        <img class="image-pin w-100" src="image/20.jpg" alt="">
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
                    <article class="p-0  shadow-radius-section shadow-section mb-4 bg-light">
                        <div class="col-12">
                            <div class="row justify-content-between p-2 pl-4 pl-md-2 ">
                                <div class="col-11 col-md-11" >
                                    <div class="row ">
                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                        </div>
                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ">
                                            <div class="cu-intro mt-2">
                                                <h6><a href="magezine" class="title-post-link">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown">
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
                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در  ]dc o,fdi نظر گرفته شده است.
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
                            <div class="row justify-content-between p-2 pl-4 pl-md-2 ">
                                <div class="col-11 col-md-11" >
                                    <div class="row ">
                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                        </div>
                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ">
                                            <div class="cu-intro mt-2">
                                                <h6><a href="magezine" class="title-post-link">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown">
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
                            <div class="row justify-content-between p-2 pl-4 pl-md-2 ">
                                <div class="col-11 col-md-11" >
                                    <div class="row ">
                                        <div class="col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width" >
                                            <img class="cu-image-com mr-1 " src="image/afarine.jpg" alt="">
                                        </div>
                                        <div class="col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ">
                                            <div class="cu-intro mt-2">
                                                <h6><a href="magezine" class="title-post-link">مرکز رشد و نواوری آفرینه&nbsp;<i style="color:#048af7;" class="fas fa-check-circle"></i></a></h6>
                                                <span class="show-time-custome"><i class="fas fa-clock"></i> ۳ دقیقه قبل</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown">
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
        <aside class="col-12 col-md-2 mx-1 mt-5 mt-md-0 bg-light shadow-radius-section" >hello1</aside>
        
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
