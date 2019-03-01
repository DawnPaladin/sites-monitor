<?php

@require('secrets.php');

header("Access-Control-Allow-Origin: *");
header("Content-Type: text/json");

function fetch($url)
{
    $curl = curl_init($url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($curl);
    curl_close($curl);
    //echo "\r\n\r\nwent to $url and all i got was this ".print_r($result,true)."\r\nyay\r\n";
    if (!$result) $result = '{}';
    return json_decode(trim($result), true);
}

$jobs = array();

foreach($secrets['jenkins'] as $jenkinsName=>$jenkinsInfo)
{
    if ($jenkinsInfo['enabled'])
    {
        $credentials = $jenkinsInfo['username'] . ':' . $jenkinsInfo['password'];

        $jenkinsData = fetch("http://$credentials@".
            $jenkinsInfo['api'].
            "/json?tree=jobs[name,description,color,builds[number,result,timestamp]{0,1}]");
        if (is_array($jenkinsData['jobs']))
        {
            $jobs = array_merge($jobs, $jenkinsData['jobs']);
        }
    }
}

echo json_encode($jobs);
