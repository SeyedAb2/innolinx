function myFunction() {
    var dots = document.getElementById("dots{post.id}");
    var moreText = document.getElementById("more{post.id}");
    var btnText = document.getElementById("myBtn{post.id}");
    var readMore = document.getElementById("read-more{post.id}");

    if (dots.style.display === "none") {
        dots.style.display = "inline";
        btnText.innerHTML = "";
        moreText.style.display = "none";
        readMore.style.display = "inline";


    } else {
        dots.style.display = "none";
        moreText.style.display = "inline";
        btnText.innerHTML = "";
        readMore.style.display = "inline";

    }
}

function backdrop(x) {
    var backdrop = document.getElementsByClassName("backdrop");
    console.log(backdrop, x);
}