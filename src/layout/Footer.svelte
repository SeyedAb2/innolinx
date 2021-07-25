<script>
    export let y;
</script>
<svelte:window bind:scrollY={y}/>
<style>
    @import "./css/fonts.css";
    footer{
        font-family: ' BYekan';
        bottom: 0;
        width: 100%;
        height: 270px;
        
        
    }
    

@media (max-width:767px) {
    .footer {
      height: 570px;
    }
}

@media (min-width: 767px) {
    .footer {
      height: 300px;
    }
}

/* Sticky footer style and color
-------------------------------------------------- */
footer {
  padding-top: 30px;
  background-color: #011C0C;
  color: #bbb;
}
footer a {
  color: #999;
  text-decoration:none;
}


footer a:hover, footer a:focus {
  color: #aaa;
  text-decoration:none;
  border-bottom:1px dotted #999;
}

footer .form-control {
    background-color: #103D22;
    box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.1);
    border: none;
    resize: none;
    color: #d1d2d2;
    padding: 0.7em 1em;
}
footer .form-group{
    margin-bottom: 25px;
}
i{
    font-size: 35px;
}

</style>

<footer class="footer" style="font-family: 'BYekan' ;">
    <div class="container">
        <div class="row">
            
            <div class="col-md-4">
                <form style="direction: rtl;">
                    <fieldset class="form-group" style="">
                        <input style="text-align: right;font-family: BYekan;" type="email" class="form-control" id="exampleInputEmail1" placeholder="لطفا ایمیل خود را وارد کنید">
                    </fieldset>
                    <fieldset class="form-group">
                        <textarea style="text-align: right;font-family: BYekan;" class="form-control" id="exampleMessage" placeholder="متن"></textarea>
                    </fieldset>
                    <fieldset class="form-group text-xs-right">
                        <button style="text-align: right;font-family: BYekan;" type="button" class="btn btn-danger btn-lg">ارسال</button>
                    </fieldset>
                </form>
            </div>
            <div class="col-md-4 order-md-first" style="direction: rtl;">
                <h5 class="text-md-right">ما را در شبکه های اجتماعی دنبال کنید</h5>
                <hr>
                <div class="row">
                    <ul class="nav" >
                        <li class="nav-item"><a href="" class="nav-link pl-0"><i class="fab fa-github fa-lg"></i></a></li>
                        <li class="nav-item"><a href="" class="nav-link"><i class="fab fa-twitter fa-lg"></i></a></li>
                        <li class="nav-item"><a href="" class="nav-link"><i class="fas fa-check-circle fa-lg"></i></a></li>
                        <li class="nav-item"><a href="" class="nav-link"><i class="fab fa-instagram fa-lg"></i></a></li>
                    </ul>
                    <br>
                </div>
            </div>
            <div class="col-md-4 order-first order-md-last" style="direction: rtl;">
                <h5 style="font-size: 30px;"><i class="fas fa-link"></i> <span>اینو</span><span>لینکس</span></h5>
                <div class="row">
                    <div class="col-6">
                        <ul class="list-unstyled">
                            <li><a href="">مدیریت بخش اصلی سایت</a></li>
                            <li><a href="">برنامه ریزی </a></li>
                            <li><a href="">اسناد طبقه بندی شده</a></li>
                            <li><a href="">سرویس دو پارچه آگرین</a></li>
                        </ul>
                    </div>
                    <div class="col-6">
                        <ul class="list-unstyled">
                            <li><a href="">داده های ثبت احوال</a></li>
                            <li><a href="">پشتیبانی سایت</a></li>
                            <li><a href="">اعضای تیم مرکزی</a></li>
                            <li><a href="">طرح سوال از مخاطب</a></li>
                        </ul>
                    </div>
                </div>
                
            </div>
            
        </div>
    </div>
</footer>
