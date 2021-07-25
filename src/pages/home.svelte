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
<section transition:scale class="container-fluid pin-parent">
    <div class="row justify-content-center">
        <article class="col-md-3 col-12 height-main">
            <div class="row mr-0 px-2 px-lg-0" style="height: 63vh;">
                <article class="col-12 mx-2 ml-md-2 ml-lg-0 mx-md-0 p-0 pin-article height-pin height-pin1 mb-2 mb-lg-2">
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
                <article class="col-12 ml-2 ml-lg-0 p-0 pin-article height-pin height-pin2 mt-1">
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
        <article style="height: 63vh;" class="col-md-6 col-11 ml-1 ml-md-0 p-0 height-pin3 pin-article">
            <div class="img-pin-div">
                <img class="w-100 d-flex img-pin" src="image/30.jpg" alt="">
            </div>
            <div class="content-pin">
                <h5>
                   <a style="font-size: 30px;" class="pin-title" href="" style="direction: rtl;">نسل جدید تبلت های هوشمند قابلیت بهره گیری از اینترمنت 5G</a> 
                </h5>
            </div>
            <a href="#">
                <img src="/image/26.jpeg" class="mag-img" alt="">
            </a>
            <div class="author-time-pin">
                <span>برنامه تلویزیونی جهان آرا <i style="color:mediumspringgreen;" class="fas fa-check-circle"></i></span> &nbsp;  <i class="fas fa-clock"></i> ۴ روز قبل
            </div>
        </article>
    </div>
</section>
<br><hr class="col-10 offset-1"><br><br><br>


