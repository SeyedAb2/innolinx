<script>
    export let y;
</script>
<svelte:window bind:scrollY={y}/>
<style>
    @import "./css/fonts.css";
    
</style>

<footer class="footer">
    <div class="container">
        <div class="icon_footer">
            <h5><img src="image/1.png">
                <span>اینو</span><span>لینکس</span></h5>
        </div>
        
        <div class="row">
            
            <div class="col-md-4">
                <form style="direction: rtl;">
                    <fieldset class="form-group">
                        <input type="email" class="form-control" id="exampleInputEmail1" placeholder="لطفا ایمیل خود را وارد کنید">
                    </fieldset>
                    <fieldset class="form-group">
                        <textarea class="form-control" id="exampleMessage" placeholder="متن"></textarea>
                    </fieldset>
                    <fieldset class="form-group text-xs-right">
                        <button  type="button" class="btn">ارسال</button>
                    </fieldset>
                </form>
            </div>
            <div class="col-md-4 order-md-first social_media" style="direction: rtl;">
                <div class="col-12">
                    <h5 class="text-center mx-auto">ما را در شبکه های اجتماعی دنبال کنید</h5>
                </div>
                <hr>
                <div class="col-12">
                    <ul class="nav justify-content-center" >
                        <li class="nav-item"><a href="" class="nav-link"><i class="fab fa-github fa-lg"></i></a></li>
                        <li class="nav-item"><a href="" class="nav-link"><i class="fab fa-twitter fa-lg"></i></a></li>
                        <li class="nav-item"><a href="" class="nav-link"><i class="fas fa-check-circle fa-lg"></i></a></li>
                        <li class="nav-item"><a href="" class="nav-link"><i class="fab fa-instagram fa-lg"></i></a></li>
                    </ul>
                    <br>
                </div>
            </div>
            <div class="col-md-4 order-first order-md-last" style="direction: rtl;">
                <div class="row">
                    <div class="col-6">
                        <ul class="list-unstyled">
                            <li><a href="">مدیریت بخش اصلی سایت</a></li>
                            <li><a href="">برنامه ریزی </a></li>
                            <li><a href="">اسناد طبقه بندی شده</a></li>
                            <li><a href="">سرویس دو پارچه آگرین</a></li>
                            <li><a href="">داده های ثبت احوال</a></li>
                            <li><a href="">پشتیبانی سایت</a></li>
                            <li><a href="">اعضای تیم مرکزی</a></li>
                            <li><a href="">طرح سوال از مخاطب</a></li>
                        </ul>
                    </div>
                    <div class="col-6">
                        <ul class="list-unstyled">
                            <li><a href="">اعضای تیم مرکزی</a></li>
                            <li><a href="">طرح سوال از مخاطب</a></li>
                            <li><a href="">اعضای تیم مرکزی</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="copyright container">
        <p>© تمام حقوق برای <a target="blank" href="http://www.inolinx.com">inolinX.com</a> محفوظ است.
</p>
    </div>

</footer>
