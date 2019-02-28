<?php

@require('secrets.php');

header("Access-Control-Allow-Origin: *");
header("Content-Type: text/json");

// Login to get token
$loadBalancerResults = array();

foreach($secrets['load-balancers'] as $loadBalancerName => $loadBalancerInfo)
{
    $login_curl = curl_init();

    $url =$loadBalancerInfo['api']."/login";

    if($loadBalancerInfo['enabled']!==false)
    {
        curl_setopt($login_curl, CURLOPT_POST, 1);
        curl_setopt($login_curl, CURLOPT_POSTFIELDS,
            [
                'username'=>$loadBalancerInfo['username'],
                'password'=>$loadBalancerInfo['password']
            ]);
        curl_setopt($login_curl, CURLOPT_URL, $url);
        curl_setopt($login_curl, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($login_curl, CURLOPT_SSL_VERIFYPEER, 0);
        curl_setopt($login_curl, CURLOPT_SSL_VERIFYHOST, 0);

        $login_result = curl_exec($login_curl);
        curl_close($login_curl);

        $json = json_decode(trim($login_result), true);
        $token = $json['token'];
        $token = base64_encode($token);
    
        // Use login token to get API data

        $getStatus_curl = curl_init();
        $url =$loadBalancerInfo['api']."/virtual_service_groups";
        $headers = array(
            'Authorization: Basic '.$token
        );
        curl_setopt($getStatus_curl, CURLOPT_URL, $url);
        curl_setopt($getStatus_curl, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($getStatus_curl, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($getStatus_curl, CURLOPT_SSL_VERIFYPEER, 0);
        curl_setopt($getStatus_curl, CURLOPT_SSL_VERIFYHOST, 0);
        $getStatus_result = curl_exec($getStatus_curl);
        curl_close($getStatus_curl);
        if($getStatus_result!="")
        {
            $getStatus_resultArray = json_decode($getStatus_result,true);
            if(is_array($getStatus_resultArray))
            {
                $loadBalancerResults = array_merge($loadBalancerResults,$getStatus_resultArray);
            }
        }
    }
}

echo $getStatus_result;
