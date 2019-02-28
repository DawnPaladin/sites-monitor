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


if ($secrets['old-jenkins']['enabled'])
{
    $credentials = $secrets['old-jenkins']['username'] . ':' . $secrets['old-jenkins']['password'];

    $oldJenkinsData = fetch("http://$credentials@jenkins.hkipm.com:8080/api/json?tree=jobs[name,description,color,builds[number,result,timestamp]{0,1}]");
    if (is_array($oldJenkinsData['jobs']))
    {
        $jobs = array_merge($jobs, $oldJenkinsData['jobs']);
    }
}


if ($secrets['new-jenkins']['enabled'])
{
    $credentials = $secrets['new-jenkins']['username'] . ':' . $secrets['new-jenkins']['password'];

    $newJenkinsData = fetch("http://$credentials@jenkins.hkipop.com/api/json?tree=jobs[name,description,color,builds[number,result,timestamp]{0,1}]");
    if (is_array($oldJenkinsData['jobs']))
    {
        $jobs = array_merge($jobs, $oldJenkinsData['jobs']);
    }
}

echo json_encode($jobs);
