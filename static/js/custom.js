(function ($) {

    "use strict";

        // PRE LOADER
        $(window).on('load',function(){
          $('.preloader').fadeOut(750); // set duration in brackets    
        });


        // navigation Section
        $('.navbar-collapse a').on('click',function(){
          $(".navbar-collapse").collapse('hide');
        });


        // Parallax Js
        function initParallax() {
          $('#home').parallax("40%", 40);
          $('#about').parallax("60%", 60);
          $('#latest').parallax("90%", 90);
          $('#work').parallax("80%", 80);
          $('#testimonial').parallax("50%", 50);
          $('#contact').parallax("70%", 70);
          }
        initParallax();
        

        // Contact Form
        $("#contact").submit(function (e) {
          e.preventDefault();
          var name = $("#cf-name").val();
          var email = $("#cf-email").val();
          var subject = $("#cf-subject").val();
          var message = $("#cf-message").val();
          var dataString = 'name=' + name + '&email=' + email + '&subject=' + subject + '&message=' + message;

          function isValidEmail(emailAddress) {
              var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
              return pattern.test(emailAddress);
          };
          if (isValidEmail(email) && (message.length > 1) && (name.length > 1)) {
              $.ajax({
                  type: "POST",
                  url: "php/contact.php",
                  data: dataString,
                  success: function () {
                      $('.text-success').fadeIn(1000);
                      $('.text-danger').fadeOut(500);
                  }
              });
          }
          else {
              $('.text-danger').fadeIn(1000);
              $('.text-success').fadeOut(500);
          }
          return false;
        });


        // Owl Carousel
        var owl = $("#owl-testimonial");
          owl.owlCarousel({
            autoPlay: 6000,
            items : 1,
            itemsDesktop : [1199,1],
            itemsDesktopSmall : [979,1],
            itemsTablet: [768,1],
            itemsTabletSmall: false,
            itemsMobile : [479,1],
            Speedfast: 200,
        }); 
        

        // smoothscroll js
        $(function() {
          $('.navbar-default a').on('click', function(event) {
            var $anchor = $(this);
            $('html, body').stop().animate({
                scrollTop: $($anchor.attr('href')).offset().top - 49
            }, 1000);
            event.preventDefault();
          });
        });  

})(jQuery);
